import {Token} from './types';
import {ContractInstance} from './types';

export class TokenRegGovWrapper {
  private tokenRegGov: ContractInstance;
  constructor(tokenRegGovContractInstance: ContractInstance) {
    this.tokenRegGov = tokenRegGovContractInstance;
  }
  public async proposeTokenAsync(token: Token, from: string) {
    const tx = await this.tokenRegGov.proposeToken(
      token.address,
      token.name,
      token.symbol,
      token.decimals,
      token.ipfsHash,
      token.swarmHash,
      {from},
    );
    return tx;
  };
  public async approveProposalAsync(proposalID: number, from: string) {
    const tx = await this.tokenRegGov.approveProposal(proposalID, {from});
    return tx;
  }
  public async refuseProposalAsync(proposalID: number, from: string) {
    const tx = await this.tokenRegGov.refuseProposal(proposalID, {from});
    return tx;
  };
  public async linkToNewTokenRegistryAsync(newTokenRegistryAddress: string, from: string) {
    const tx = await this.tokenRegGov.linkToNewTokenRegistry(newTokenRegistryAddress, {from});
    return tx;
  };
  public async addTokenAsync(token: Token, from: string) {
    const tx = await this.tokenRegGov.addToken(
      token.address,
      token.name,
      token.symbol,
      token.decimals,
      token.ipfsHash,
      token.swarmHash,
      {from},
    );
    return tx;
  }
  public async getProposalMetaDataAsync(proposalID: number) {
    const data = await this.tokenRegGov.getProposalMetaData(proposalID);
    const token: Token = {
      address: data[0],
      name: data[1],
      symbol: data[2],
      decimals: data[3].toNumber(),
      ipfsHash: data[4],
      swarmHash: data[5],
    };
    return token;
  }

  public async getTokenByNameAsync(tokenName: string) {
    const data = await this.tokenRegGov.getTokenByName(tokenName);
    const token: Token = {
      address: data[0],
      name: data[1],
      symbol: data[2],
      decimals: data[3].toNumber(),
      ipfsHash: data[4],
      swarmHash: data[5],
    };
    return token;
  }
  public async getTokenBySymbolAsync(tokenSymbol: string) {
    const data = await this.tokenRegGov.getTokenBySymbol(tokenSymbol);
    const token: Token = {
      address: data[0],
      name: data[1],
      symbol: data[2],
      decimals: data[3].toNumber(),
      ipfsHash: data[4],
      swarmHash: data[5],
    };
    return token;
  }
}
