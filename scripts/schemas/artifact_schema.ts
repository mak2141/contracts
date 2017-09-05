export interface ContractArtifact {
    contract_name: string;
    networks: ContractNetworks;
};

export interface ContractNetworks {
    [key: number]: ContractData;
};

export interface ContractData {
    solc_version: string;
    optimizer_runs: number;
    keccak256: string;
    abi: any[];
    unlinked_binary: string;
    address?: string;
    updated_at: number;
};
