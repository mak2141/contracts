import * as fs from 'fs';
import * as solc from 'solc';
import * as promisify from 'es6-promisify';
import * as path from 'path';
import * as _ from 'lodash';
import ethUtil =  require('ethereumjs-util');
import {binPaths} from './solc/bin_paths';
import {ContractArtifact, ContractNetworks, ContractData} from './schemas/artifact_schema';
import {CompilerOptions, ContractSources} from './schemas/compiler_schema';

const readdirAsync = promisify(fs.readdir);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const doesPathExist = promisify(fs.access);
const mkdirAsync = promisify(fs.mkdir);

const log = console.log;

const JSON_REPLACER: any = null;
const JSON_SPACES = 4;

export class Compiler {
    private contractsDir: string;
    private networkId: number;
    private optimizerRuns: number;
    private artifactsDir: string;

    constructor(options: CompilerOptions) {
        this.contractsDir = options.contractsDir;
        this.networkId = options.networkId;
        this.optimizerRuns = options.optimizerRuns;
        this.artifactsDir = options.artifactsDir;
    }

    public async compileAll(): Promise<void> {
        await this.createArtifactsDirIfDoesNotExist();
        const sources: ContractSources = await this.generateSources(this.contractsDir);

        const findImports = (importPath: string): any => {
            const contractBaseName = path.basename(importPath);
            const source = sources[contractBaseName];
            return {contents: source};
        };

        const contractBaseNames = _.keys(sources);
        const warnings: any = {};

        _.each(contractBaseNames, async contractBaseName => {
            const source = sources[contractBaseName];
            const contractName = path.basename(contractBaseName, '.sol');
            const currentArtifactPath = `${this.artifactsDir}/${contractName}.json`;
            const sourceHash = `0x${ethUtil.sha3(source).toString('hex')}`;

            let currentArtifactString: string;
            let currentArtifact: ContractArtifact;
            let oldNetworks: ContractNetworks;
            let shouldCompile: boolean;
            try {
                currentArtifactString = await readFileAsync(currentArtifactPath, {encoding: 'utf8'});
                currentArtifact = JSON.parse(currentArtifactString);
                oldNetworks = currentArtifact.networks;
                const oldNetwork: ContractData = oldNetworks[this.networkId];
                if (!_.isUndefined(oldNetwork) && oldNetwork.keccak256 === sourceHash &&
                    oldNetwork.optimizer_runs === this.optimizerRuns) {
                    shouldCompile = false;
                } else {
                    shouldCompile = true;
                }
            } catch (err) {
                shouldCompile = true;
            }

            if (shouldCompile) {
                const input = {[contractBaseName]: source};
                const solcVersion = this.parseSolidityVersion(input[contractBaseName]);
                const fullSolcVersion = binPaths[solcVersion];
                const solcBinPath = `./solc/solc_bin/${fullSolcVersion}`;
                const solcBin = require(solcBinPath);
                const solcInstance = solc.setupMethods(solcBin);

                log(`Compiling ${contractBaseName}...`);
                const compiled = solcInstance.compile({sources: input}, this.optimizerRuns, findImports);

                if (!_.isUndefined(compiled.errors)) {
                    _.each(compiled.errors, errMsg => {
                        const normalizedErrMsg = this.getNormalizedErrMsg(errMsg);
                        if (_.isUndefined(warnings[normalizedErrMsg])) {
                            warnings[normalizedErrMsg] = true;
                            log(normalizedErrMsg);
                        }
                    });
                }

                const contractIdentifier = `${contractBaseName}:${contractName}`;
                const contractData: ContractData = {
                    solc_version: solcVersion,
                    keccak256: sourceHash,
                    optimizer_runs: this.optimizerRuns,
                    abi: JSON.parse(compiled.contracts[contractIdentifier].interface),
                    unlinked_binary: `0x${compiled.contracts[contractIdentifier].bytecode}`,
                    updated_at: Date.now(),
                };

                let newArtifact: ContractArtifact;
                if (!_.isUndefined(currentArtifactString)) {
                    const newNetworks: ContractNetworks = _.assign({}, oldNetworks, {[this.networkId]: contractData});
                    newArtifact = _.assign({}, currentArtifact, {networks: newNetworks});
                } else {
                    newArtifact = {
                        contract_name: contractName,
                        networks: {[this.networkId]: contractData},
                    };
                }

                await writeFileAsync(currentArtifactPath, JSON.stringify(newArtifact, JSON_REPLACER, JSON_SPACES));
                log(`${contractBaseName} artifact saved!`);
            }
        });
    }

    public async generateSources(dirPath: string): Promise<ContractSources> {
        let sources: ContractSources = {};
        let dirContents: string[];
        try {
            dirContents = await readdirAsync(dirPath);
        } catch (err) {
            throw new Error(`No directory found at ${dirPath}`);
        }
        for (const name of dirContents) {
            const contentPath = `${dirPath}/${name}`;
            if (path.extname(name) === '.sol') {
                try {
                    sources[name] = await readFileAsync(contentPath, {encoding: 'utf8'});
                    log(`Reading ${name} source...`);
                } catch (err) {
                    log(`Could not find file at ${contentPath}`);
                }
            } else {
                const nestedSources = await this.generateSources(contentPath);
                sources = _.assign({}, sources, nestedSources);
            }
        }
        return sources;
    }

    public parseSolidityVersion(source: string): string {
        try {
            const versionPragma = source.match(/(?:solidity\s)([^]?[0-9]{1,2}[.][0-9]{1,2}[.][0-9]{1,2})/)[0];
            const solcVersion = versionPragma.replace('^', '').slice(9);
            return solcVersion;
        } catch (err) {
            throw new Error('Could not find Solidity version in source');
        }
    }

    public getNormalizedErrMsg(errMsg: string): string {
        try {
            const errPath = errMsg.match(/(.*\.sol)/)[0];
            const baseContract = path.basename(errPath);
            const normalizedErrMsg = errMsg.replace(errPath, baseContract);
            return normalizedErrMsg;
        } catch (err) {
            throw new Error('Could not find a path in error message');
        }

    }

    public async createArtifactsDirIfDoesNotExist(): Promise<void> {
        try {
            await doesPathExist(this.artifactsDir);
        } catch (err) {
            log('Creating artifacts directory...');
            await mkdirAsync(this.artifactsDir);
        }
    }
}
