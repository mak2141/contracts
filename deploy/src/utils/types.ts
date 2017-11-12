import * as Web3 from 'web3';

export enum AbiType {
    Function = 'function',
    Constructor = 'constructor',
    Event = 'event',
    Fallback = 'fallback',
}

export interface ContractArtifact {
    contract_name: string;
    networks: ContractNetworks;
}

export interface ContractNetworks {
    [key: number]: ContractData;
}

export interface ContractData {
    solc_version: string;
    optimizer_enabled: number;
    keccak256: string;
    abi: Web3.ContractAbi;
    unlinked_binary: string;
    address?: string;
    constructor_args?: string;
    updated_at: number;
}

export interface SolcErrors {
    [key: string]: boolean;
}

export interface CompilerOptions {
    contractsDir: string;
    networkId: number;
    optimizerEnabled: number;
    artifactsDir: string;
}

export interface DeployerOptions {
    artifactsDir: string;
    jsonrpcPort: number;
    networkId: number;
    gasPrice: string;
}

export interface ContractSources {
    [key: string]: string;
}

export interface ImportContents {
    contents: string;
}

export enum ZeroExError {
    ContractDoesNotExist = 'CONTRACT_DOES_NOT_EXIST',
    ExchangeContractDoesNotExist = 'EXCHANGE_CONTRACT_DOES_NOT_EXIST',
    UnhandledError = 'UNHANDLED_ERROR',
    UserHasNoAssociatedAddress = 'USER_HAS_NO_ASSOCIATED_ADDRESSES',
    InvalidSignature = 'INVALID_SIGNATURE',
    ContractNotDeployedOnNetwork = 'CONTRACT_NOT_DEPLOYED_ON_NETWORK',
    InsufficientAllowanceForTransfer = 'INSUFFICIENT_ALLOWANCE_FOR_TRANSFER',
    InsufficientBalanceForTransfer = 'INSUFFICIENT_BALANCE_FOR_TRANSFER',
    InsufficientEthBalanceForDeposit = 'INSUFFICIENT_ETH_BALANCE_FOR_DEPOSIT',
    InsufficientWEthBalanceForWithdrawal = 'INSUFFICIENT_WETH_BALANCE_FOR_WITHDRAWAL',
    InvalidJump = 'INVALID_JUMP',
    OutOfGas = 'OUT_OF_GAS',
    NoNetworkId = 'NO_NETWORK_ID',
    SubscriptionNotFound = 'SUBSCRIPTION_NOT_FOUND',
}
