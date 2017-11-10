import * as _ from 'lodash';
import * as chai from 'chai';
import {chaiSetup} from './utils/chai_setup';
import ethUtil = require('ethereumjs-util');
import {ZeroEx} from '0x.js';
import {TokenRegGovWrapper} from '../../util/token_registry_governance_wrapper';
import {ContractInstance} from '../../util/types';
import {Artifacts} from '../../util/artifacts';
import {constants} from '../../util/constants';

const {TokenRegistry} = new Artifacts(artifacts);
const {TokenRegistryGovernance} = new Artifacts(artifacts);

chaiSetup.configure();
const expect = chai.expect;

contract('TokenRegistryGovernance', (accounts: string[]) => {
  const ownerGov = accounts[0];
  const notOwner = accounts[1];

  const tokenAddress1 = `0x${ethUtil.setLength(ethUtil.toBuffer('0x1'), 20, false).toString('hex')}`;
  const tokenAddress2 = `0x${ethUtil.setLength(ethUtil.toBuffer('0x2'), 20, false).toString('hex')}`;

  const token1 = {
    address: tokenAddress1,
    name: 'testToken1',
    symbol: 'TT1',
    decimals: 18,
    ipfsHash: `0x${ethUtil.sha3('ipfs1').toString('hex')}`,
    swarmHash: `0x${ethUtil.sha3('swarm1').toString('hex')}`,
  };

  const token2 = {
    address: tokenAddress2,
    name: 'testToken2',
    symbol: 'TT2',
    decimals: 18,
    ipfsHash: `0x${ethUtil.sha3('ipfs2').toString('hex')}`,
    swarmHash: `0x${ethUtil.sha3('swarm2').toString('hex')}`,
  };

  const nullToken = {
    address: ZeroEx.NULL_ADDRESS,
    name: '',
    symbol: '',
    decimals: 0,
    ipfsHash: constants.NULL_BYTES,
    swarmHash: constants.NULL_BYTES,
  };

  let tokenReg: ContractInstance;
  let tokenRegGov: ContractInstance;
  let tokenRegGovWrapper: TokenRegGovWrapper;

  beforeEach(async () => {
    tokenReg = await TokenRegistry.new();
    tokenRegGov = await TokenRegistryGovernance.new(tokenReg.address);
    await tokenReg.transferOwnership(tokenRegGov.address);
    tokenRegGovWrapper = await new TokenRegGovWrapper(tokenRegGov);
  });

  describe('tokenRegistryGovernance is owner', async () => {
    it('should have TokenRegistryGovernance address as owner of TokenRegistry contract', async () => {
      const tokenRegOwner = await tokenReg.owner.call();
      expect(tokenRegOwner).to.be.deep.equal(tokenRegGov.address);
    });
  });

  describe('addToken', async () => {
    it('should throw when not called by ownerGov', async () => {
      return expect(tokenRegGovWrapper.addTokenAsync(token1, notOwner)).to.be.rejectedWith(constants.INVALID_OPCODE);
    });

    it('should add token metadata when called by ownerGov', async () => {
      await tokenRegGovWrapper.addTokenAsync(token1, ownerGov);
      const tokenData = await tokenRegGovWrapper.getTokenMetaDataAsync(token1.address);
      expect(tokenData).to.be.deep.equal(token1);
    });

    it('should throw if token already exists', async () => {
      await tokenRegGovWrapper.addTokenAsync(token1, ownerGov);
      return expect(tokenRegGovWrapper.addTokenAsync(token1, ownerGov)).to.be.rejectedWith(constants.INVALID_OPCODE);
    });

    it('should throw if token address is null', async () => {
      return expect(tokenRegGovWrapper.addTokenAsync(nullToken, ownerGov)).to.be.rejectedWith(constants.INVALID_OPCODE);
    });

    it('should throw if name already exists', async () => {
      await tokenRegGovWrapper.addTokenAsync(token1, ownerGov);
      const duplicateNameToken = _.assign({}, token2, {name: token1.name});

      return expect(tokenRegGovWrapper.addTokenAsync(duplicateNameToken, ownerGov))
        .to.be.rejectedWith(constants.INVALID_OPCODE);
    });

    it('should throw if symbol already exists', async () => {
      await tokenRegGovWrapper.addTokenAsync(token1, ownerGov);
      const duplicateSymbolToken = _.assign({}, token2, {symbol: token1.symbol});

      return expect(tokenRegGovWrapper.addTokenAsync(duplicateSymbolToken, ownerGov))
        .to.be.rejectedWith(constants.INVALID_OPCODE);
    });
  });

  describe('after addToken', () => {
    beforeEach(async () => {
      await tokenRegGovWrapper.addTokenAsync(token1, ownerGov);
    });

    describe('getTokenByName', () => {
      it('should return token metadata when given the token name', async () => {
        const tokenData = await tokenRegGovWrapper.getTokenByNameAsync(token1.name);
        expect(tokenData).to.be.deep.equal(token1);
      });
    });

    describe('getTokenBySymbol', () => {
      it('should return token metadata when given the token symbol', async () => {
        const tokenData = await tokenRegGovWrapper.getTokenBySymbolAsync(token1.symbol);
        expect(tokenData).to.be.deep.equal(token1);
      });
    });

    describe('setTokenName', () => {
      it('should throw when not called by ownerGov', async () => {
        return expect(tokenReg.setTokenName(token1.address, token2.name, {from: notOwner}))
          .to.be.rejectedWith(constants.INVALID_OPCODE);
      });

      it('should change the token name when called by ownerGov', async () => {
        const res = await tokenReg.setTokenName(token1.address, token2.name, {from: ownerGov});
        expect(res.logs).to.have.length(1);
        const [newData, oldData] = await Promise.all([
          tokenRegGovWrapper.getTokenByNameAsync(token2.name),
          tokenRegGovWrapper.getTokenByNameAsync(token1.name),
        ]);

        const expectedNewData = _.assign({}, token1, {name: token2.name});
        const expectedOldData = nullToken;
        expect(newData).to.be.deep.equal(expectedNewData);
        expect(oldData).to.be.deep.equal(expectedOldData);
      });

      it('should throw if the name already exists', async () => {
        await tokenRegGovWrapper.addTokenAsync(token2, ownerGov);

        return expect(tokenReg.setTokenName(token1.address, token2.name, {from: ownerGov}))
          .to.be.rejectedWith(constants.INVALID_OPCODE);
      });

      it('should throw if token does not exist', async () => {
        return expect(tokenReg.setTokenName(nullToken.address, token2.name, {from: ownerGov}))
          .to.be.rejectedWith(constants.INVALID_OPCODE);
      });
    });

    describe('setTokenSymbol', () => {
      it('should throw when not called by ownerGov', async () => {
        return expect(tokenReg.setTokenSymbol(token1.address, token2.symbol, {from: notOwner}))
          .to.be.rejectedWith(constants.INVALID_OPCODE);
      });

      it('should change the token symbol when called by ownerGov', async () => {
        const res = await tokenReg.setTokenSymbol(token1.address, token2.symbol, {from: ownerGov});
        expect(res.logs).to.have.length(1);
        const [newData, oldData] = await Promise.all([
          tokenRegGovWrapper.getTokenBySymbolAsync(token2.symbol),
          tokenRegGovWrapper.getTokenBySymbolAsync(token1.symbol),
        ]);

        const expectedNewData = _.assign({}, token1, {symbol: token2.symbol});
        const expectedOldData = nullToken;
        expect(newData).to.be.deep.equal(expectedNewData);
        expect(oldData).to.be.deep.equal(expectedOldData);
      });

      it('should throw if the symbol already exists', async () => {
        await tokenRegGovWrapper.addTokenAsync(token2, ownerGov);

        return expect(tokenReg.setTokenSymbol(token1.address, token2.symbol, {from: ownerGov}))
          .to.be.rejectedWith(constants.INVALID_OPCODE);
      });

      it('should throw if token does not exist', async () => {
        return expect(tokenReg.setTokenSymbol(nullToken.address, token2.symbol, {from: ownerGov}))
          .to.be.rejectedWith(constants.INVALID_OPCODE);
      });
    });

    describe('removeToken', () => {
      it('should throw if not called by ownerGov', async () => {
        const index = 0;
        return expect(tokenReg.removeToken(token1.address, index, {from: notOwner}))
          .to.be.rejectedWith(constants.INVALID_OPCODE);
      });

      it('should remove token metadata when called by ownerGov', async () => {
        const index = 0;
        const res = await tokenReg.removeToken(token1.address, index, {from: ownerGov});
        expect(res.logs).to.have.length(1);
        const tokenData = await tokenRegGovWrapper.getTokenMetaDataAsync(token1.address);
        expect(tokenData).to.be.deep.equal(nullToken);
      });

      it('should throw if token does not exist', async () => {
        const index = 0;
        return expect(tokenReg.removeToken(nullToken.address, index, {from: ownerGov}))
          .to.be.rejectedWith(constants.INVALID_OPCODE);
      });

      it('should throw if token at given index does not match address', async () => {
        await tokenRegGovWrapper.addTokenAsync(token2, ownerGov);
        const incorrectIndex = 0;
        return expect(tokenReg.removeToken(token2.address, incorrectIndex, {from: ownerGov}))
          .to.be.rejectedWith(constants.INVALID_OPCODE);
      });
    });
  });
});
