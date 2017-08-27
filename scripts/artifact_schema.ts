export interface ContractArtifact {
    contract_name: string;
    networks: {
        [key: number]: ContractData;
    }
};

export interface ContractData {
    solc_version: string;
    keccak256: string;
    abi: any[];
    unlinked_binary: string;
    address?: string;
}
