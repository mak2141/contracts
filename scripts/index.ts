import * as yargs from 'yargs';
import * as path from 'path';
import {CompilerOptions, ContractSources} from './schemas/compiler_schema';
import {Compiler} from './Compiler';

const DEFAULT_OPTIMIZER_RUNS = 0;
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
