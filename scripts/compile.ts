import * as fs from 'fs';
import * as solc from 'solc';
import * as yargs from 'yargs';
import * as promisify from 'es6-promisify';
import * as path from 'path';
import * as _ from 'lodash';
import * as semver from 'semver';
import ethUtil =  require('ethereumjs-util');
import {binPaths} from './solc/bin_paths';
import {ContractArtifact, ContractNetworks, ContractData} from './artifact_schema';

const DEFAULT_OPTIMIZER_RUNS = 0;
const DEFAULT_CONTRACTS_DIR = path.resolve('contracts');
const DEFAULT_ARTIFACTS_DIR = `${path.resolve('build')}/artifacts/`;
const DEFAULT_NETWORK_ID = 50;

const readdirAsync = promisify(fs.readdir);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const doesPathExist = promisify(fs.access);
const mkdirAsync = promisify(fs.mkdir);

const log = console.log;

interface CompilerOptions {
    contractsDir: string;
    networkId: number;
    optimizerRuns: number;
    artifactsDir: string;
}

interface ContractSources {
    [key: string]: string;
}

class Compiler {
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

                const replacer: any = null;
                const space = 4;
                await writeFileAsync(currentArtifactPath, JSON.stringify(newArtifact, replacer, space));
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

    public async createArtifactsDirIfDoesNotExist(): Promise<void> {
        try {
            await doesPathExist(this.artifactsDir);
        } catch (err) {
            log('Creating artifacts directory...');
            await mkdirAsync(this.artifactsDir);
        }
    }
}

(async () => {
    const args = yargs
        .option('contracts-dir', {
            type: 'string',
            default: DEFAULT_CONTRACTS_DIR,
            description: 'path of contracts directory to compile',
        })
        .option('network-id', {
            type: 'number',
            default: DEFAULT_NETWORK_ID,
            description: 'mainnet=1, kovan=42, testrpc=50',
        })
        .option('optimizer-runs', {
            type: 'number',
            default: DEFAULT_OPTIMIZER_RUNS,
            description: 'number of times to run optimizer',
        })
        .option('artifacts-dir', {
            type: 'string',
            default: DEFAULT_ARTIFACTS_DIR,
            description: 'path to write contracts artifacts to',
        })
        .help()
        .argv;

    const options: CompilerOptions = {
        contractsDir: args.contractsDir,
        networkId: args.networkId,
        optimizerRuns: args.optimizerRuns,
        artifactsDir: args.artifactsDir,
    };

    const compiler = new Compiler(options);
    await compiler.compileAll();
})();
