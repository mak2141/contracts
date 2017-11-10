import {ContractInstance} from '../util/types';
import {Artifacts} from '../util/artifacts';
import ethUtil = require('ethereumjs-util');
const {
  TokenTransferProxy,
  MultiSigWalletWithTimeLock,
  TokenRegistry,
  TokenRegistryGovernance,
} = new Artifacts(artifacts);

let tokenTransferProxy: ContractInstance;
let tokenRegistry: ContractInstance;
let tokenRegistryGovernance: ContractInstance;

module.exports = (deployer: any, network: string) => {
  if (network !== 'development') {
    deployer.then(() => {
      Promise.all([
        TokenTransferProxy.deployed(),
        TokenRegistry.deployed(),
        TokenRegistryGovernance.deployed(),
      ]).then((instances: ContractInstance[]) => {
        let tokenTransferProxy: ContractInstance;
        let tokenRegistryGovernance: ContractInstance;
        [tokenTransferProxy, tokenRegistry, tokenRegistryGovernance] = instances;
        return tokenTransferProxy.transferOwnership(MultiSigWalletWithTimeLock.address);
      }).then(() => {
        return tokenRegistry.transferOwnership(TokenRegistryGovernance.address);
      }).then(() => {
        return TokenRegistryGovernance.transferOwnership(MultiSigWalletWithTimeLock.address);
      });
    });
  } else {
    deployer.then(() => {
      Promise.all([
        TokenTransferProxy.deployed(),
        TokenRegistry.deployed(),
        TokenRegistryGovernance.deployed(),
      ]).then((instances: ContractInstance[]) => {
        [tokenTransferProxy, tokenRegistry, tokenRegistryGovernance] = instances;
        const testAddress = `0x${ethUtil.setLength(ethUtil.toBuffer('0x2'), 20, false).toString('hex')}`;
        return tokenRegistry.transferOwnership(TokenRegistryGovernance.address);
      });
    });
  }
};
