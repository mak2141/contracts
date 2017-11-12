import * as yargs from 'yargs';
import * as path from 'path';
import {CompilerOptions, DeployerOptions, CliOptions} from './src/utils/types';
import {getNetworkIdIfExistsAsync} from './src/utils/network';
import {commands} from './src/commands';

const DEFAULT_OPTIMIZER_ENABLED = false;
const DEFAULT_CONTRACTS_DIR = path.resolve('contracts');
const DEFAULT_ARTIFACTS_DIR = `${path.resolve('build')}/artifacts/`;
const DEFAULT_NETWORK_ID = 50;
const DEFAULT_JSONRPC_PORT = 8545;
const DEFAULT_GAS_PRICE = '20000000000';

const args: CliOptions = yargs
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
    .option('gas-price', {
        type: 'string',
        default: DEFAULT_GAS_PRICE,
        description: 'gasPrice to be used for transactions',
    })
    .help()
    .argv;

/**
 * Compiles all contracts with options passed in through CLI.
 */
const onCompileCommand = async (): Promise<void> => {
    const opts: CompilerOptions = {
        contractsDir: args.contractsDir,
        networkId: args.networkId,
        optimizerEnabled: args.optimize ? 1 : 0,
        artifactsDir: args.artifactsDir,
    };
    await commands.compileAsync(opts);
};

/**
 * Compiles all contracts and runs migration script with options passed in through CLI.
 * Uses network ID of running node.
 */
const onMigrateCommand = async (): Promise<void> => {
    const networkIdIfExists = await getNetworkIdIfExistsAsync(args.jsonrpcPort);
    const compilerOpts: CompilerOptions = {
        contractsDir: args.contractsDir,
        networkId: networkIdIfExists,
        optimizerEnabled: args.optimize ? 1 : 0,
        artifactsDir: args.artifactsDir,
    };
    await commands.compileAsync(compilerOpts);

    const deployerOpts: DeployerOptions = {
        artifactsDir: args.artifactsDir,
        jsonrpcPort: args.jsonrpcPort,
        networkId: networkIdIfExists,
        gasPrice: args.gasPrice,
    };
    await commands.migrateAsync(deployerOpts);
};

/**
 * Builder function is expected for command argument, but not needed in this context.
 */
const commandBuilder = (): void => undefined;

yargs
    .command('compile',
    'compile contracts',
    commandBuilder,
    onCompileCommand)
    .command('migrate',
    'compile an deploy contracts using migration scripts',
    commandBuilder,
    onMigrateCommand)
    .argv;
