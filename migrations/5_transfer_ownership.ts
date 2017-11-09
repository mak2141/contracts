import {ContractInstance} from '../util/types';
import {Artifacts} from '../util/artifacts';
const {
  TokenTransferProxy,
  MultiSigWalletWithTimeLock,
  TokenRegistry,
  TokenRegistryGovernance,
} = new Artifacts(artifacts);

let tokenRegistry: ContractInstance;
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
      });
    });
  }
};
