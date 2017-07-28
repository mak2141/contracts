import * as moment from 'moment';
import * as BigNumber from 'bignumber.js';
import {ZeroEx, Order, SignedOrder} from '0x.js';
import { ContractInstance } from '../util/types';
import { Artifacts } from '../util/artifacts';
const {
  TokenTransferProxy,
  Exchange,
  ZRXToken,
  EtherToken,
  TokenSale,
} = new Artifacts(artifacts);

const CAP_PER_ADDRESS = 12000000000000000000; // 12 ETH

const accounts = web3.eth.accounts;

let proxy: ContractInstance;
let exchange: ContractInstance;
let zrxToken: ContractInstance;
let etherToken: ContractInstance;
let tokenSale: ContractInstance;
let order: Order|SignedOrder;
module.exports = (deployer: any, network: string) => {
  deployer.then(() => {
    Promise.all([
      TokenTransferProxy.deployed(),
      Exchange.deployed(),
      ZRXToken.deployed(),
      EtherToken.deployed(),
    ]).then((instances: ContractInstance[]) => {
      [proxy, exchange, zrxToken, etherToken] = instances;
      return deployer.deploy(TokenSale, exchange.address, proxy.address, zrxToken.address,
                             etherToken.address, CAP_PER_ADDRESS, {
                               from: accounts[0],
                             });
    }).then(() => {
      return TokenSale.deployed();
    }).then(tokenSaleInstance => {
      tokenSale = tokenSaleInstance;
      order = {
        exchangeContractAddress: exchange.address,
        expirationUnixTimestampSec: new BigNumber(moment().add(1, 'year').unix()),
        feeRecipient: '0x0000000000000000000000000000000000000000',
        maker: accounts[0],
        makerFee: new BigNumber(0),
        makerTokenAddress: zrxToken.address,
        makerTokenAmount: ZeroEx.toBaseUnitAmount(new BigNumber(500000000), 18),
        salt: ZeroEx.generatePseudoRandomSalt(),
        taker: tokenSale.address,
        takerFee: new BigNumber(0),
        takerTokenAddress: etherToken.address,
        takerTokenAmount: ZeroEx.toBaseUnitAmount(new BigNumber(120000), 18),
      };
      const zeroEx = new ZeroEx(web3.currentProvider);
      const orderHash = zeroEx.getOrderHashHex(order);
      return zeroEx.signOrderHashAsync(orderHash, accounts[0]);
    }).then(ecSignature => {
      // Order Details
      const orderAddresses = [
        order.maker,
        order.taker,
        order.makerTokenAddress,
        order.takerTokenAddress,
        order.feeRecipient,
      ];
      const orderValues = [
          order.makerTokenAmount,
          order.takerTokenAmount,
          order.makerFee,
          order.takerFee,
          order.expirationUnixTimestampSec,
          order.salt,
      ];
      const v = ecSignature.v;
      const r = ecSignature.r;
      const s = ecSignature.s;

      return tokenSale.init(orderAddresses, orderValues, v, r, s, {
        from: accounts[0],
      });
    });
  });
};
