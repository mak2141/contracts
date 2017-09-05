export interface CompilerOptions {
    contractsDir: string;
    networkId: number;
    optimizerRuns: number;
    artifactsDir: string;
}

export interface ContractSources {
    [key: string]: string;
}
