import * as Web3 from 'web3';
import {BigNumber} from 'bignumber.js';
import {Deployer} from './../src/deployer';
import {Web3Wrapper} from './../src/utils/web3_wrapper';

export const migrator = {
    /**
     * Custom migrations should be defined in this function. This will be called with the CLI 'migrate' command.
     * @param deployer Deployer instance.
     */
    async runMigrationsAsync(deployer: Deployer): Promise<void> {
        const web3Wrapper: Web3Wrapper = deployer.web3Wrapper;
        const accounts: string[] = await web3Wrapper.getAvailableAddressesAsync();

        const independentContracts: Web3.ContractInstance[] = await Promise.all([
            deployer.deployAndSaveAsync('TokenTransferProxy'),
            deployer.deployAndSaveAsync('ZRXToken'),
            deployer.deployAndSaveAsync('EtherToken'),
            deployer.deployAndSaveAsync('TokenRegistry'),
        ]);
        const [tokenTransferProxy, zrxToken, etherToken, tokenReg] = independentContracts;

        const exchangeArgs = [zrxToken.address, tokenTransferProxy.address];
        const owners = [accounts[0], accounts[1]];
        const confirmationsRequired = new BigNumber(2);
        const secondsRequired = new BigNumber(0);
        const multiSigArgs = [owners, confirmationsRequired, secondsRequired, tokenTransferProxy.address];
        const dependentContracts: Web3.ContractInstance[] = await Promise.all([
            deployer.deployAndSaveAsync('Exchange', exchangeArgs),
            deployer.deployAndSaveAsync('MultiSigWalletWithTimeLockExceptRemoveAuthorizedAddress', multiSigArgs),
        ]);
        const [exchange, multiSig] = dependentContracts;

        const owner = accounts[0];
        await tokenTransferProxy.addAuthorizedAddress.sendTransactionAsync(exchange.address, {from: owner});
        await tokenTransferProxy.transferOwnership.sendTransactionAsync(multiSig.address, {from: owner});
        // // TODO: Add tokens to TokenRegistry
    },
};
