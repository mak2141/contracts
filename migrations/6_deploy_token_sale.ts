import * as moment from 'moment';
import * as BigNumber from 'bignumber.js';
import {ZeroEx, Order, SignedOrder, ECSignature} from '0x.js';
import { RPC } from '../util/rpc';
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

let tokenTransferProxy: ContractInstance;
let exchange: ContractInstance;
let zrxToken: ContractInstance;
let etherToken: ContractInstance;
let tokenSale: ContractInstance;
let order: Order|SignedOrder;
let saleStartTimestamp: number;
const makerTokenAmount = ZeroEx.toBaseUnitAmount(new BigNumber(500000000), 18);
module.exports = (deployer: any, network: string, accounts: string[]) => {
  deployer.then(() => {
    return Promise.all([
      TokenTransferProxy.deployed(),
      Exchange.deployed(),
      ZRXToken.deployed(),
      EtherToken.deployed(),
    ]).then((instances: ContractInstance[]) => {
      [tokenTransferProxy, exchange, zrxToken, etherToken] = instances;
    });
  }).then(() => {
      return deployer.deploy(TokenSale, exchange.address, zrxToken.address, etherToken.address, {
        from: accounts[0],
      });
  }).then(() => {
    return TokenSale.deployed();
  }).then((tokenSaleInstance: ContractInstance) => {
    tokenSale = tokenSaleInstance;
    return web3.eth.getBlock('latest');
  }).then((latestBlock: any) => {
    saleStartTimestamp = latestBlock.timestamp + 20; // Add 20 sec.
    const isRegistered = true;
    return tokenSale.changeRegistrationStatuses(accounts, isRegistered);
  }).then(() => {
    return zrxToken.approve(tokenTransferProxy.address, makerTokenAmount);
  }).then(() => {
    order = {
      exchangeContractAddress: exchange.address,
      expirationUnixTimestampSec: new BigNumber(moment().add(1, 'year').unix()),
      feeRecipient: '0x0000000000000000000000000000000000000000',
      maker: accounts[0],
      makerFee: new BigNumber(0),
      makerTokenAddress: zrxToken.address,
      makerTokenAmount,
      salt: ZeroEx.generatePseudoRandomSalt(),
      taker: tokenSale.address,
      takerFee: new BigNumber(0),
      takerTokenAddress: etherToken.address,
      takerTokenAmount: ZeroEx.toBaseUnitAmount(new BigNumber(120000), 18),
    };
    const zeroEx = new ZeroEx(web3.currentProvider);
    const orderHash = ZeroEx.getOrderHashHex(order);
    return zeroEx.signOrderHashAsync(orderHash, accounts[0]);
  }).then((ecSignature: ECSignature) => {
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

    return tokenSale.initializeSale(orderAddresses, orderValues, v, r, s, saleStartTimestamp, CAP_PER_ADDRESS, {
      from: accounts[0],
    });
  }).then(() => {
      const rpc = new RPC();
      return rpc.increaseTimeAsync(100);
  }).then(() => {
    return tokenSale.fillOrderWithEth.estimateGas({
        from: accounts[1],
        value: 100000000000000000,
    });
  }).then((estimateGas: any) => {
      return tokenSale.fillOrderWithEth({
          from: accounts[1],
          value: 100000000000000000,
      });
  }).then((response: any) => {
    console.log('response', JSON.stringify(response));
  });
};
