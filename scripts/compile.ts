import * as fs from 'fs';
import * as solc from 'solc';
import * as yargs from 'yargs';
import * as promisify from 'es6-promisify';
import * as path from 'path';
import * as _ from 'lodash';
import * as semver from 'semver';
import ethUtil =  require('ethereumjs-util');
import {binPaths} from './solc/bin_paths';
import {ContractArtifact, ContractData} from './artifact_schema';

const DEFAULT_OPTIMIZER_RUNS = 0;
const DEFAULT_CONTRACTS_DIR = path.resolve('contracts');
const DEFAULT_NETWORK_ID = 50;

const readdirAsync = promisify(fs.readdir);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

interface CompilerOptions {
    contractsDir: string;
    networkId: number;
    optimizerRuns: number;
}

interface ContractSources {
    [key: string]: string;
}

class Compiler {
    private contractsDir: string;
    private networkId: number;
    private optimizerRuns: number;

    constructor(options: CompilerOptions) {
        this.contractsDir = options.contractsDir;
        this.networkId = options.networkId;
        this.optimizerRuns = options.optimizerRuns;
    }

    public async compileAll(): Promise<void> {
        const sources = await this.generateSources(this.contractsDir);
        const findImports = (importPath: string): any => {
            const contractBaseName = path.basename(importPath);
            const source = sources[contractBaseName];
            return {contents: source};
        }
        const contractBaseNames = _.keys(sources);
        _.each(contractBaseNames, async contractBaseName => {
            const source = sources[contractBaseName];
            const contractName = path.basename(contractBaseName, '.sol');
            const currentArtifactPath = `${path.resolve('build')}/artifacts/${contractName}.json`;
            const sourceHash = `0x${ethUtil.sha3(source).toString('hex')}`;

            let currentArtifactString;
            let currentArtifact: ContractArtifact;
            let oldNetworks;
            let shouldCompile = true;
            try {
                currentArtifactString = await readFileAsync(currentArtifactPath, {encoding: 'utf8'});
                currentArtifact = JSON.parse(currentArtifactString);
                oldNetworks = currentArtifact.networks;
                const oldNetwork: ContractData = oldNetworks[this.networkId];
                if (oldNetwork && oldNetwork.keccak256 === sourceHash) {
                    shouldCompile = false;
                }
            } catch (err) {} // should always compile if file does not exist

            if (shouldCompile) {
                const input = {[contractBaseName]: source};
                const solcVersion = this.parseSolidityVersion(input[contractBaseName]);
                const fullSolcVersion = binPaths[solcVersion];
                const solcBinPath = `./solc/solc_bin/${fullSolcVersion}`;
                const solcBin = require(solcBinPath);
                const solcInstance = solc.setupMethods(solcBin);

                console.log(`Compiling ${contractBaseName}...`);
                const compiled = solcInstance.compile({sources: input}, this.optimizerRuns, findImports);

                const contractIdentifier = `${contractBaseName}:${contractName}`;
                const contractData: ContractData = {
                    solc_version: solcVersion,
                    keccak256: sourceHash,
                    abi: JSON.parse(compiled.contracts[contractIdentifier].interface),
                    unlinked_binary: `0x${compiled.contracts[contractIdentifier].bytecode}`,
                };

                let newArtifact: ContractArtifact;
                if (!_.isUndefined(currentArtifactString)) {
                    const newNetworks = _.assign({}, oldNetworks, {[this.networkId]: contractData});
                    newArtifact = _.assign({}, currentArtifact, {networks: newNetworks});
                } else {
                    newArtifact = {
                        contract_name: contractName,
                        networks: {[this.networkId]: contractData},
                    };
                }

                await writeFileAsync(currentArtifactPath, JSON.stringify(newArtifact));
                console.log(`${contractBaseName} artifact saved!`)
            }
        });
    }

    public async generateSources(dirPath: string): Promise<ContractSources> {
        let sources: any = {};
        const dirContents: string[] = await readdirAsync(dirPath);
        for (const name of dirContents) {
            const contentPath = `${dirPath}/${name}`;
            if (path.extname(name) === '.sol') {
                sources[name] = await readFileAsync(contentPath, {encoding: 'utf8'});
                console.log(`Reading ${name} source...`);
            } else {
                const nestedSources = await this.generateSources(contentPath);
                sources = _.assign({}, sources, nestedSources);
            }
        }
        return sources;
    }

    public parseSolidityVersion(source: string): string {
        try {
            const versionPragma = source.match(/(?:solidity\s)([^?][0-9][.][0-9][.][0-9]+)/)[0];
            const solcVersion = versionPragma.replace('^', '').slice(9);
            return solcVersion;
        } catch (err) {
            throw new Error('Could not find Solidity version');
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
            description: 'mainnet=1, kovan=42, testrpc=50'
        })
        .option('optimizer-runs', {
            type: 'number',
            default: DEFAULT_OPTIMIZER_RUNS,
            description: 'number of times to run optimizer',
        })
        .help()
        .argv;

    const options: CompilerOptions = {
        contractsDir: args.contractsDir,
        networkId: args.networkId,
        optimizerRuns: args.optimizerRuns,
    };

    const compiler = new Compiler(options);
    await compiler.compileAll();
})();
