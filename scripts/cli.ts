import * as yargs from 'yargs';
import * as path from 'path';
import {CompilerOptions, ContractSources} from './../util/types';
import {Compiler} from './compiler';

const DEFAULT_OPTIMIZER_ENABLED = false;
const DEFAULT_CONTRACTS_DIR = path.resolve('contracts');
const DEFAULT_ARTIFACTS_DIR = `${path.resolve('build')}/artifacts/`;
const DEFAULT_NETWORK_ID = 50;

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
        .option('optimize', {
            type: 'boolean',
            default: DEFAULT_OPTIMIZER_ENABLED,
            description: 'enable optimizer',
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
        optimizerEnabled: args.optimize ? 1: 0,
        artifactsDir: args.artifactsDir,
    };

    const compiler = new Compiler(options);
    await compiler.compileAllAsync();
})();
