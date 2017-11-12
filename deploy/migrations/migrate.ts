import {Deployer} from './../src/deployer';
import {DeployerOptions} from './../src/utils/types';

/**
 * Custom migrations should be defined in this function. This will be called with the CLI 'migrate' command.
 * @param opts Environmental options passed in from CLI.
 */
export async function runMigrationsAsync(opts: DeployerOptions): Promise<void> {
    const deployer = new Deployer(opts);
    await deployer.deployAsync('EtherToken', []);
}
