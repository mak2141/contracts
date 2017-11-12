import * as path from 'path';
import * as _ from 'lodash';
import * as ethUtil from 'ethereumjs-util';
import * as Web3 from 'web3';
import promisify = require('es6-promisify');
import solc = require('solc');
import {binPaths} from './../solc/bin_paths';
import {utils} from './utils/utils';
import {
    readdirAsync,
    readFileAsync,
    writeFileAsync,
    mkdirAsync,
    doesPathExistSync,
} from './utils/fs_wrapper';
import {
    ContractArtifact,
    ContractNetworks,
    ContractData,
    SolcErrors,
    CompilerOptions,
    ContractSources,
    ImportContents,
} from './utils/types';

const {consoleLog, stringifyWithFormatting} = utils;
const SOLIDITY_FILE_EXTENSION = '.sol';

export class Compiler {
    private _contractsDir: string;
    private _networkId: number;
    private _optimizerEnabled: number;
    private _artifactsDir: string;
    private _contractSources: ContractSources;
    private _solcErrors: Set<string>;

    constructor(opts: CompilerOptions) {
        this._contractsDir = opts.contractsDir;
        this._networkId = opts.networkId;
        this._optimizerEnabled = opts.optimizerEnabled;
        this._artifactsDir = opts.artifactsDir;
        this._solcErrors = new Set();
    }
    /**
     * Compiles all Solidity files found in contractsDir and writes JSON artifacts to artifactsDir.
     */
    public async compileAllAsync(): Promise<void> {
        await this.createArtifactsDirIfDoesNotExistAsync();
        this._contractSources = await this.getContractSourcesAsync(this._contractsDir);

        const contractBaseNames = _.keys(this._contractSources);
        const compiledContractPromises = _.map(contractBaseNames, (contractBaseName: string): Promise<void> => {
            return this.compileContractAsync(contractBaseName);
        });
        await Promise.all(compiledContractPromises);

        this._solcErrors.forEach(errMsg => {
            consoleLog(errMsg);
        });
    }
    /**
     * Recursively retrieves Solidity source code from directory.
     * @param  dirPath Directory to search.
     * @return Mapping of contract name to contract source.
     */
    private async getContractSourcesAsync(dirPath: string): Promise<ContractSources> {
        let dirContents: string[] = [];
        try {
            dirContents = await readdirAsync(dirPath);
        } catch (err) {
            throw new Error(`No directory found at ${dirPath}`);
        }
        let sources: ContractSources = {};
        for (const name of dirContents) {
            const contentPath = `${dirPath}/${name}`;
            if (path.extname(name) === SOLIDITY_FILE_EXTENSION) {
                try {
                    const opts = {
                        encoding: 'utf8',
                    };
                    sources[name] = await readFileAsync(contentPath, opts);
                    consoleLog(`Reading ${name} source...`);
                } catch (err) {
                    consoleLog(`Could not find file at ${contentPath}`);
                }
            } else {
                try {
                    const nestedSources = await this.getContractSourcesAsync(contentPath);
                    sources = {
                      ...sources,
                      ...nestedSources,
                    };
                } catch (err) {
                    consoleLog(`${contentPath} is not a directory or ${SOLIDITY_FILE_EXTENSION} file`);
                }
            }
        }
        return sources;
    }
    /**
     * Compiles contract and saves artifact to artifactsDir.
     * @param contractBaseName Name of contract with '.sol' extension.
     */
    private async compileContractAsync(contractBaseName: string): Promise<void> {
        if (_.isUndefined(this._contractSources)) {
            throw new Error('Contract sources not yet initialized');
        }

        const source = this._contractSources[contractBaseName];
        const contractName = path.basename(contractBaseName, SOLIDITY_FILE_EXTENSION);
        const currentArtifactPath = `${this._artifactsDir}/${contractName}.json`;
        const sourceHash = `0x${ethUtil.sha3(source).toString('hex')}`;

        let currentArtifactString: string;
        let currentArtifact: ContractArtifact;
        let oldNetworks: ContractNetworks;
        let shouldCompile: boolean;
        try {
            const opts = {
                encoding: 'utf8',
            };
            currentArtifactString = await readFileAsync(currentArtifactPath, opts);
            currentArtifact = JSON.parse(currentArtifactString);
            oldNetworks = currentArtifact.networks;
            const oldNetwork: ContractData = oldNetworks[this._networkId];
            shouldCompile = _.isUndefined(oldNetwork) ||
                            oldNetwork.keccak256 !== sourceHash ||
                            oldNetwork.optimizer_enabled !== this._optimizerEnabled;
        } catch (err) {
            shouldCompile = true;
        }

        if (!shouldCompile) {
            return;
        }

        const input = {
            [contractBaseName]: source,
        };
        const solcVersion = this.parseSolidityVersion(source);
        const fullSolcVersion = binPaths[solcVersion];
        const solcBinPath = `./../solc/solc_bin/${fullSolcVersion}`;
        const solcBin = require(solcBinPath);
        const solcInstance = solc.setupMethods(solcBin);

        consoleLog(`Compiling ${contractBaseName}...`);
        const sourcesToCompile = {
            sources: input,
        };
        const compiled = solcInstance.compile(sourcesToCompile,
                                              this._optimizerEnabled,
                                              this.findImportsIfSourcesExist.bind(this));

        if (!_.isUndefined(compiled.errors)) {
            _.each(compiled.errors, errMsg => {
                const normalizedErrMsg = this.getNormalizedErrMsg(errMsg);
                this._solcErrors.add(normalizedErrMsg);
            });
        }

        const contractIdentifier = `${contractBaseName}:${contractName}`;
        const abi: Web3.ContractAbi = JSON.parse(compiled.contracts[contractIdentifier].interface);
        const unlinked_binary = `0x${compiled.contracts[contractIdentifier].bytecode}`;
        const updated_at = Date.now();
        const contractData: ContractData = {
            solc_version: solcVersion,
            keccak256: sourceHash,
            optimizer_enabled: this._optimizerEnabled,
            abi,
            unlinked_binary,
            updated_at,
        };

        let newArtifact: ContractArtifact;
        if (!_.isUndefined(currentArtifactString)) {
            newArtifact = {
                ...currentArtifact,
                networks: {
                    ...oldNetworks,
                    [this._networkId]: contractData,
                }
            };
        } else {
            newArtifact = {
                contract_name: contractName,
                networks: {
                    [this._networkId]: contractData,
                },
            };
        }

        const artifactString = stringifyWithFormatting(newArtifact);
        await writeFileAsync(currentArtifactPath, artifactString);
        consoleLog(`${contractBaseName} artifact saved!`);
    }
    /**
     * Searches Solidity source code for compiler version.
     * @param  source Source code of contract.
     * @return Solc compiler version.
     */
    private parseSolidityVersion(source: string): string {
        const solcVersionMatch = source.match(/(?:solidity\s\^?)([0-9]{1,2}[.][0-9]{1,2}[.][0-9]{1,2})/);
        if (_.isNull(solcVersionMatch)) {
            throw new Error('Could not find Solidity version in source');
        }
        const solcVersion = solcVersionMatch[1];
        return solcVersion;
    }
    /**
     * Normalizes the path found in the error message.
     * Example: converts 'base/Token.sol:6:46: Warning: Unused local variable' to 'Token.sol:6:46: Warning: Unused local variable'
     * This is used to prevent logging the same error multiple times.
     * @param  errMsg An error message from the compiled output.
     * @return The error message with directories truncated from the contract path.
     */
    private getNormalizedErrMsg(errMsg: string): string {
        const errPathMatch = errMsg.match(/(.*\.sol)/);
        if (_.isNull(errPathMatch)) {
            throw new Error('Could not find a path in error message');
        }
        const errPath = errPathMatch[0];
        const baseContract = path.basename(errPath);
        const normalizedErrMsg = errMsg.replace(errPath, baseContract);
        return normalizedErrMsg;
    }
    /**
     * Callback to resolve dependencies with `solc.compile`.
     * Throws error if contractSources not yet initialized.
     * @param  importPath Path to an imported dependency.
     * @return Import contents object containing source code of dependency.
     */
    private findImportsIfSourcesExist(importPath: string): ImportContents {
        if (_.isUndefined(this._contractSources)) {
            throw new Error('Contract sources not yet initialized');
        }
        const contractBaseName = path.basename(importPath);
        const source = this._contractSources[contractBaseName];
        const importContents: ImportContents = {
            contents: source,
        };
        return importContents;
    }
    /**
     * Creates the artifacts directory if it does not already exist.
     */
    private async createArtifactsDirIfDoesNotExistAsync(): Promise<void> {
        if (!doesPathExistSync(this._artifactsDir)) {
            consoleLog('Creating artifacts directory...');
            await mkdirAsync(this._artifactsDir);
        }
    }
}
