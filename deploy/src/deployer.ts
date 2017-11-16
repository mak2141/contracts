import * as Web3 from 'web3';
import * as _ from 'lodash';
import promisify = require('es6-promisify');
import {Contract} from './utils/contract';
import {Web3Wrapper} from './utils/web3_wrapper';
import {utils} from './utils/utils';
import {encoder} from './utils/encoder';
import {fsWrapper} from './utils/fs_wrapper';
import {
    ContractArtifact,
    DeployerOptions,
} from './utils/types';

// Gas added to gas estimate to make sure there is sufficient gas for deployment.
const extraGas = 500000;

export class Deployer {
    private artifactsDir: string;
    private jsonrpcPort: number;
    private networkId: number;
    private web3Wrapper: Web3Wrapper;
    private defaults: Partial<Web3.TxData>;

    constructor(opts: DeployerOptions) {
        this.artifactsDir = opts.artifactsDir;
        this.jsonrpcPort = opts.jsonrpcPort;
        this.networkId = opts.networkId;
        const jsonrpcUrl = `http://localhost:${this.jsonrpcPort}`;
        const web3Provider = new Web3.providers.HttpProvider(jsonrpcUrl);
        this.defaults = opts.defaults;
        this.web3Wrapper = new Web3Wrapper(web3Provider, this.defaults);
    }
    /**
     * Loads contract artifact and deploys contract with given arguments.
     * @param contractName Name of the contract to deploy. Must match name of an artifact in artifacts directory.
     * @param args Array of contract constructor arguments.
     * @return Deployed contract instance.
     */
    public async deployAsync(contractName: string, args: any[]): Promise<Web3.ContractInstance> {
        const artifactPath = `${this.artifactsDir}/${contractName}.json`;
        let contractArtifact: ContractArtifact;
        try {
            contractArtifact = require(artifactPath);
        } catch (err) {
            throw new Error(`Artifact not found for contract: ${contractName}`);
        }
        const contractData = contractArtifact.networks[this.networkId];
        if (_.isUndefined(contractData)) {
            throw new Error(`Data not found in artifact for contract: ${contractName}`);
        }
        const data = contractData.unlinked_binary;
        let from: string;
        if (_.isUndefined(this.defaults.from)) {
            const accounts = await this.web3Wrapper.getAvailableAddressesAsync();
            from = accounts[0];
        } else {
            from = this.defaults.from;
        }
        const gasEstimate: number = await this.web3Wrapper.estimateGasAsync({data});
        const gas = gasEstimate + extraGas;
        const txData = {
            gasPrice: this.defaults.gasPrice,
            from,
            data,
            gas,
        };
        const abi = contractData.abi;
        const contract: Web3.Contract<Web3.ContractInstance> = this.web3Wrapper.getContractFromAbi(abi);
        const web3ContractInstance = await this.promisifiedDeploy(contract, args, txData);
        const deployedAddress = web3ContractInstance.address;
        utils.consoleLog(`${contractName}.sol successfully deployed at ${deployedAddress}`);
        const encodedConstructorArgs = encoder.encodeConstructorArgsFromAbi(args, abi);
        const newContractData = {
            ...contractData,
            address: deployedAddress,
            constructor_args: encodedConstructorArgs,
        };
        const newArtifact = {
            ...contractArtifact,
            networks: {
                ...contractArtifact.networks,
                [this.networkId]: newContractData,
            },
        };
        const artifactString = utils.stringifyWithFormatting(newArtifact);
        await fsWrapper.writeFileAsync(artifactPath, artifactString);
        const promiWeb3ContractInstance = new Contract(web3ContractInstance, this.defaults);
        return promiWeb3ContractInstance;
    }
    /**
     * A promisified version of `contract.new`.
     * @param contract Web3 contract to deploy.
     * @param args Constructor arguments to use in deployment.
     * @param txData Tx options used for deployment.
     */
    private promisifiedDeploy(contract: Web3.Contract<Web3.ContractInstance>, args: any[],
                              txData: Partial<Web3.TxData>): Promise<any> {
        const deployPromise = new Promise((resolve, reject) => {
            /**
             * Contract is inferred as 'any' because TypeScript
             * is not able to read 'new' from the Contract interface
             */
            (contract as any).new(...args, txData, async (err: Error, res: any): Promise<any> => {
                if (err) {
                    reject(err);
                } else if (_.isUndefined(res.address) && !_.isUndefined(res.transactionHash)) {
                    utils.consoleLog(`transactionHash: ${res.transactionHash}`);
                } else {
                    resolve(res);
                }
            });
        });
        return deployPromise;
    }
}
