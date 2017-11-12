import * as Web3 from 'web3';
import * as _ from 'lodash';
import {Contract} from './utils/contract';
import {utils} from './utils/utils';
import {writeFileAsync} from './utils/fs_wrapper';
import promisify = require('es6-promisify');
import {
    ContractArtifact,
    DeployerOptions,
} from './utils/types';

const {consoleLog, stringifyWithFormatting} = utils;

export class Deployer {
    private _artifactsDir: string;
    private _jsonrpcPort: number;
    private _networkId: number;
    private _web3: Web3;
    private _defaults: Partial<Web3.TxData>;

    constructor(opts: DeployerOptions) {
        this._artifactsDir = opts.artifactsDir;
        this._jsonrpcPort = opts.jsonrpcPort;
        this._networkId = opts.networkId;
        const jsonrpcUrl = `http://localhost:${this._jsonrpcPort}`;
        const web3Provider = new Web3.providers.HttpProvider(jsonrpcUrl);
        this._web3 = new Web3(web3Provider);
        this._defaults = {
            gasPrice: opts.gasPrice,
        };
    }

    /**
     * Loads contract artifact and deploys contract with given arguments.
     * @param contractName Name of the contract to deploy. Must match name of an artifact in artifacts directory.
     * @param args Array of contract constructor arguments.
     * @return Deployed contract instance.
     */
    public async deployAsync(contractName: string, args: any[]): Promise<Web3.ContractInstance> {
        const artifactPath = `${this._artifactsDir}/${contractName}.json`;
        let contractArtifact: ContractArtifact;
        try {
            contractArtifact = require(artifactPath);
        } catch (err) {
            throw new Error('Contract artifact not found');
        }
        const contractData = contractArtifact.networks[this._networkId];
        if (_.isUndefined(contractData)) {
            throw new Error('No contract data found on this network');
        }
        const data = contractData.unlinked_binary;
        const accounts: string[] = await promisify(this._web3.eth.getAccounts)();
        const gas = await promisify(this._web3.eth.estimateGas)({data});
        const txData: Partial<Web3.TxData> = {
            ...this._defaults,
            from: accounts[0],
            data,
            gas,
        };
        const abi = contractData.abi;
        const contract: Web3.Contract<Web3.ContractInstance> = this._web3.eth.contract(abi);
        // Deployment is not promisified because contract.new fires the callback twice
        return (contract as any).new(...args, txData, async (err: Error, res: any): Promise<Web3.ContractInstance> => {
            if (err) {
                throw err;
            } else if (_.isUndefined(res.address) && !_.isUndefined(res.transactionHash)) {
                consoleLog(`transactionHash: ${res.transactionHash}`);
            } else {
                const web3ContractInstance: Web3.ContractInstance = res;
                const deployedAddress = web3ContractInstance.address;
                consoleLog(`${contractName}.sol successfully deployed at ${deployedAddress}`);
                const newContractData = {
                    ...contractData,
                    address: deployedAddress,
                };
                const newArtifact = {
                    ...contractArtifact,
                    networks: {
                        ...contractArtifact.networks,
                        [this._networkId]: newContractData,
                    },
                };
                const artifactString = stringifyWithFormatting(newArtifact);
                await writeFileAsync(artifactPath, artifactString);
                const promiWeb3ContractInstance = new Contract(web3ContractInstance, this._defaults);
                return promiWeb3ContractInstance;
            }
        });
    }
}
