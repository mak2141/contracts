import {DeployerOptions, CompilerOptions} from './utils/types';
import {Compiler} from './compiler';
import {Deployer} from './deployer';
import {migrator} from './../migrations/migrate';

export const commands = {
    async compileAsync(opts: CompilerOptions): Promise<void> {
        const compiler = new Compiler(opts);
        await compiler.compileAllAsync();
    },
    async migrateAsync(opts: DeployerOptions): Promise<void> {
        const deployer = new Deployer(opts);
        await migrator.runMigrationsAsync(deployer);
    },
    async deployAsync(contractName: string, args: any[], opts: DeployerOptions): Promise<void> {
        const deployer = new Deployer(opts);
        await deployer.deployAsync(contractName, args);
    },
};
