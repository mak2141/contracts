export interface SolcOutput {
    contract_name: string;
    networks: {
        [key: number]: ContractData;
    }
};

export interface ContractData {
    solc_version: string;
    abi: any[];
    unlinked_binary: string;
    address?: string;
}
