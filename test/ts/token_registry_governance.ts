import * as _ from 'lodash';
import * as chai from 'chai';
import * as BigNumber from 'bignumber.js';
import {chaiSetup} from './utils/chai_setup';
import ethUtil = require('ethereumjs-util');
import {ZeroEx} from '0x.js';
import {TokenRegWrapper} from '../../util/token_registry_wrapper';
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

  enum ProposalStatus {
                        Null = new BigNumber(0),
                        Pending = new BigNumber(1),
                        Approved = new BigNumber(2),
                        Refused = new BigNumber(3),
                      };

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
  let tokenRegWrapper: TokenRegWrapper;
  let tokenRegGovWrapper: TokenRegGovWrapper;

  beforeEach(async () => {
    tokenReg = await TokenRegistry.new();
    tokenRegGov = await TokenRegistryGovernance.new(tokenReg.address);
    await tokenReg.transferOwnership(tokenRegGov.address);
    tokenRegWrapper = await new TokenRegWrapper(tokenReg);
    tokenRegGovWrapper = await new TokenRegGovWrapper(tokenRegGov);
  });

  describe('tokenRegistryGovernance is owner', async () => {
    it('should have TokenRegistryGovernance address as owner of TokenRegistry contract', async () => {
      const tokenRegOwner = await tokenReg.owner.call();
      expect(tokenRegOwner).to.be.deep.equal(tokenRegGov.address);
    });
    describe('transferTokenRegistryOwnership via Gov Contract', () => {
      const newOwner = accounts[2];

      it('should throw if not called by ownerGov', async () => {
        return expect(tokenRegGov.transferTokenRegistryOwnership(newOwner, {from: notOwner}))
          .to.be.rejectedWith(constants.INVALID_OPCODE);
      });

      it('should transfer onwership to newOwner if called by ownerGov', async () => {
        await tokenRegGov.transferTokenRegistryOwnership(newOwner, {from: ownerGov});
        const newtokenRegOwner = await tokenReg.owner.call();
        expect(newtokenRegOwner).to.be.deep.equal(newOwner);
      });
    });
  });

  describe('proposeToken', async () => {
    it('should allow non-owner to send proposal', async () => {
      await tokenRegGovWrapper.proposeTokenAsync(token1, notOwner);
      const tokenData = await tokenRegGovWrapper.getProposalMetaDataAsync(1);
      expect(tokenData).to.be.deep.equal(token1);
    });

    it('should allow owner to send proposal', async () => {
      await tokenRegGovWrapper.proposeTokenAsync(token1, ownerGov);
      const tokenData = await tokenRegGovWrapper.getProposalMetaDataAsync(1);
      expect(tokenData).to.be.deep.equal(token1);
    });
  });
  describe('after proposeToken', async () => {
    beforeEach(async () => {
      await tokenRegGovWrapper.proposeTokenAsync(token1, notOwner);
    });

    it('should increment proposal ID by 1 with new proposals', async () => {
      const id0 = await tokenRegGov.getLastID();
      await tokenRegGovWrapper.proposeTokenAsync(token1, ownerGov);
      const id1 = await tokenRegGov.getLastID();
      expect(id0.add(1)).to.be.deep.equal(id1);
    });

    it('should set proposal status to pending', async () => {
      const id0 = await tokenRegGov.getLastID();
      const status = await tokenRegGov.getProposalStatus(id0);
      const bigStatus = new BigNumber(status);
      expect(bigStatus).to.be.bignumber.equal(ProposalStatus.Pending);
    });

    describe('approveProposal', async () => {
      it('should throw when called not by ownerGov', async () => {
        return expect(tokenRegGovWrapper.approveProposalAsync(1, notOwner))
                      .to.be.rejectedWith(constants.INVALID_OPCODE);
      });

      it('should add proposal to tokenRegistry when called by ownerGov', async () => {
        await tokenRegGovWrapper.approveProposalAsync(1, ownerGov);
        const tokenData = await tokenRegWrapper.getTokenMetaDataAsync(token1.address)
        expect(tokenData).to.be.deep.equal(token1)
      });

      it('should set proposal status to approved after being approved', async () => {
        await tokenRegGovWrapper.approveProposalAsync(1, ownerGov);
        const status = await tokenRegGov.getProposalStatus(1);
        const bigStatus = new BigNumber(status);
        expect(bigStatus).to.be.bignumber.equal(ProposalStatus.Approved);
      });

      it('should throw if proposal already approved', async () => {
        const id0 = await tokenRegGov.getLastID();
        await tokenRegGovWrapper.approveProposalAsync(id0, ownerGov);
        return expect(tokenRegGovWrapper.approveProposalAsync(id0, ownerGov))
                      .to.be.rejectedWith(constants.INVALID_OPCODE);
      });

      it('should throw if proposal was refused', async () => {
        await tokenRegGovWrapper.refuseProposalAsync(1, ownerGov);
        return expect(tokenRegGovWrapper.approveProposalAsync(1, ownerGov))
                      .to.be.rejectedWith(constants.INVALID_OPCODE);
      });
    });

    describe('removeProposal', async () => {
      it('should throw when called not by ownerGov', async () => {
        return expect(tokenRegGovWrapper.refuseProposalAsync(1, notOwner))
                      .to.be.rejectedWith(constants.INVALID_OPCODE);
      });

      it('should set proposal status to refused after being called by ownerGov', async () => {
        await tokenRegGovWrapper.refuseProposalAsync(1, ownerGov);
        const status = await tokenRegGov.getProposalStatus(1);
        const bigStatus = new BigNumber(status);
        expect(bigStatus).to.be.bignumber.equal(ProposalStatus.Refused);
      });
    });
  });

  describe('addToken', async () => {
    it('should throw when not called by ownerGov', async () => {
      return expect(tokenRegGovWrapper.addTokenAsync(token1, notOwner)).to.be.rejectedWith(constants.INVALID_OPCODE);
    });

    it('should add token metadata when called by ownerGov', async () => {
      await tokenRegGovWrapper.addTokenAsync(token1, ownerGov);
      const tokenData = await tokenRegWrapper.getTokenMetaDataAsync(token1.address);
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

  describe('linkToNewTokenRegistry', () => {
    let tokenReg2: ContractInstance;
    it('should throw if not called by ownerGov', async () => {
      tokenReg2 = await TokenRegistry.new();
      const tokenReg2Address = tokenReg2.address;
      return expect(tokenRegGovWrapper.linkToNewTokenRegistryAsync(tokenReg2Address, notOwner))
        .to.be.rejectedWith(constants.INVALID_OPCODE);
    });

    it('should link to new tokenRegistry address when called by ownerGov', async () => {
      tokenReg2 = await TokenRegistry.new();
      const tokenReg2Address = tokenReg2.address;
      await tokenRegGovWrapper.linkToNewTokenRegistryAsync(tokenReg2Address, ownerGov);
      const govLinkedTokenRegistryAddress = await tokenRegGov.getTokenRegistryAddress();
      expect(govLinkedTokenRegistryAddress).to.be.deep.equal(tokenReg2Address);
    });
  });

  describe('after addToken', () => {
    beforeEach(async () => {
      await tokenRegGovWrapper.addTokenAsync(token1, ownerGov);
    });

    describe('getTokenByName', () => {
      it('should return token metadata when given the token name', async () => {
        const tokenData = await tokenRegWrapper.getTokenByNameAsync(token1.name);
        expect(tokenData).to.be.deep.equal(token1);
      });
    });

    describe('getTokenBySymbol', () => {
      it('should return token metadata when given the token symbol', async () => {
        const tokenData = await tokenRegWrapper.getTokenBySymbolAsync(token1.symbol);
        expect(tokenData).to.be.deep.equal(token1);
      });
    });

    describe('setTokenName', () => {
      it('should throw when not called by ownerGov', async () => {
        return expect(tokenRegGov.setTokenName(token1.address, token2.name, {from: notOwner}))
          .to.be.rejectedWith(constants.INVALID_OPCODE);
      });

      it('should change the token name when called by ownerGov', async () => {
        const res = await tokenRegGov.setTokenName(token1.address, token2.name, {from: ownerGov});
        expect(res.receipt.logs).to.have.length(1);
        const [newData, oldData] = await Promise.all([
          tokenRegWrapper.getTokenByNameAsync(token2.name),
          tokenRegWrapper.getTokenByNameAsync(token1.name),
        ]);

        const expectedNewData = _.assign({}, token1, {name: token2.name});
        const expectedOldData = nullToken;
        expect(newData).to.be.deep.equal(expectedNewData);
        expect(oldData).to.be.deep.equal(expectedOldData);
      });

      it('should throw if the name already exists', async () => {
        await tokenRegGovWrapper.addTokenAsync(token2, ownerGov);

        return expect(tokenRegGov.setTokenName(token1.address, token2.name, {from: ownerGov}))
          .to.be.rejectedWith(constants.INVALID_OPCODE);
      });

      it('should throw if token does not exist', async () => {
        return expect(tokenRegGov.setTokenName(nullToken.address, token2.name, {from: ownerGov}))
          .to.be.rejectedWith(constants.INVALID_OPCODE);
      });
    });

    describe('setTokenSymbol', () => {
      it('should throw when not called by ownerGov', async () => {
        return expect(tokenRegGov.setTokenSymbol(token1.address, token2.symbol, {from: notOwner}))
          .to.be.rejectedWith(constants.INVALID_OPCODE);
      });

      it('should change the token symbol when called by ownerGov', async () => {
        const res = await tokenRegGov.setTokenSymbol(token1.address, token2.symbol, {from: ownerGov});
        expect(res.receipt.logs).to.have.length(1);
        const [newData, oldData] = await Promise.all([
          tokenRegWrapper.getTokenBySymbolAsync(token2.symbol),
          tokenRegWrapper.getTokenBySymbolAsync(token1.symbol),
        ]);

        const expectedNewData = _.assign({}, token1, {symbol: token2.symbol});
        const expectedOldData = nullToken;
        expect(newData).to.be.deep.equal(expectedNewData);
        expect(oldData).to.be.deep.equal(expectedOldData);
      });

      it('should throw if the symbol already exists', async () => {
        await tokenRegGovWrapper.addTokenAsync(token2, ownerGov);

        return expect(tokenRegGov.setTokenSymbol(token1.address, token2.symbol, {from: ownerGov}))
          .to.be.rejectedWith(constants.INVALID_OPCODE);
      });

      it('should throw if token does not exist', async () => {
        return expect(tokenRegGov.setTokenSymbol(nullToken.address, token2.symbol, {from: ownerGov}))
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
        const res = await tokenRegGov.removeToken(token1.address, index, {from: ownerGov});
        expect(res.receipt.logs).to.have.length(1);
        const tokenData = await tokenRegWrapper.getTokenMetaDataAsync(token1.address);
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
