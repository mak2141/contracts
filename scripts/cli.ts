import * as yargs from 'yargs';
import * as path from 'path';
import {CompilerOptions, ContractSources} from './../util/types';
import {Compiler} from './compiler';

const DEFAULT_OPTIMIZER_ENABLED = false;
const DEFAULT_CONTRACTS_DIR = path.resolve('contracts');
const DEFAULT_ARTIFACTS_DIR = `${path.resolve('build')}/artifacts/`;
const DEFAULT_NETWORK_ID = 50;
const DEFAULT_JSONRPC_PORT = 8545;

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
    .option('jsonrpc-port', {
        type: 'number',
        default: DEFAULT_JSONRPC_PORT,
        description: 'port connected to JSON RPC',
    })
    .help()
    .argv;

yargs
    .command('compile', 'compile contracts', () => {}, async (): Promise<void> => {
        const options: CompilerOptions = {
            contractsDir: args.contractsDir,
            networkId: args.networkId,
            optimizerEnabled: args.optimize ? 1 : 0,
            artifactsDir: args.artifactsDir,
        };

        const compiler = new Compiler(options);
        await compiler.compileAllAsync();
    })
    .argv;
