import * as yargs from 'yargs';
import * as path from 'path';
import {CompilerOptions, DeployerOptions} from './src/utils/types';
import {Compiler} from './src/compiler';
import {Deployer} from './src/deployer';

const DEFAULT_OPTIMIZER_ENABLED = false;
const DEFAULT_CONTRACTS_DIR = path.resolve('contracts');
const DEFAULT_ARTIFACTS_DIR = `${path.resolve('build')}/artifacts/`;
const DEFAULT_NETWORK_ID = 50;
const DEFAULT_JSONRPC_PORT = 8545;
const DEFAULT_GAS_PRICE = '20000000000';

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
    .option('gas-price', {
        type: 'string',
        default: DEFAULT_GAS_PRICE,
        description: 'gasPrice to be used for transactions',
    })
    .help()
    .argv;

const commandBuilder = (): void => undefined;

const onCompileCommand = async (): Promise<void> => {
    const opts: CompilerOptions = {
        contractsDir: args.contractsDir,
        networkId: args.networkId,
        optimizerEnabled: args.optimize ? 1 : 0,
        artifactsDir: args.artifactsDir,
    };
    const compiler = new Compiler(opts);
    await compiler.compileAllAsync();
};

const onMigrateCommand = async (): Promise<void> => {
    await onCompileCommand();
    const opts: DeployerOptions = {
        artifactsDir: args.artifactsDir,
        jsonrpcPort: args.jsonrpcPort,
        networkId: args.networkId,
        gasPrice: args.gasPrice,
    };
    const deployer = new Deployer(opts);
    await deployer.deploy('EtherToken', []);
};

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
