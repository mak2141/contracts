import 'mocha';
import * as chai from 'chai';
import {Compiler} from './../src/compiler';
import {Deployer} from './../src/deployer';
import {fsWrapper} from './../src/utils/fs_wrapper';
import {
    exchange_binary,
    constructor_args,
} from './fixtures/exchange_bin';
import {constants} from './util/constants';
import {
    ContractArtifact,
    ContractData,
    CompilerOptions,
    DeployerOptions,
} from './../src/utils/types';

const expect = chai.expect;
const artifactsDir = `${__dirname}/fixtures/artifacts`;
const contractsDir = `${__dirname}/fixtures/contracts`;
const exchangeArtifactPath = `${artifactsDir}/Exchange.json`;
const compilerOpts: CompilerOptions = {
    artifactsDir,
    contractsDir,
    networkId: constants.networkId,
    optimizerEnabled: constants.optimizerEnabled,
};
const deployerOpts: DeployerOptions = {
    artifactsDir,
    networkId: constants.networkId,
    jsonrpcPort: constants.jsonrpcPort,
    defaults: {
        gasPrice: constants.gasPrice,
    },
};

beforeEach(async () => {
    if (fsWrapper.doesPathExistSync(exchangeArtifactPath)) {
        await fsWrapper.removeFileAsync(exchangeArtifactPath);
    }
});
describe('#Compiler', () => {
    it('should create an Exchange artifact with the correct unlinked binary', async () => {
        const compiler = new Compiler(compilerOpts);
        await compiler.compileAllAsync();
        const opts = {
            encoding: 'utf8',
        };
        const exchangeArtifactString = await fsWrapper.readFileAsync(exchangeArtifactPath, opts);
        const exchangeArtifact: ContractArtifact = JSON.parse(exchangeArtifactString);
        const exchangeContractData: ContractData = exchangeArtifact.networks[constants.networkId];
        // The last 43 bytes of the binaries are metadata which may not be equivalent
        const unlinkedBinaryWithoutMetadata = exchangeContractData.unlinked_binary.slice(0, -86);
        const exchangeBinaryWithoutMetadata = exchange_binary.slice(0, -86);
        expect(unlinkedBinaryWithoutMetadata).to.equal(exchangeBinaryWithoutMetadata);
    }).timeout(constants.timeoutMs);
});
describe('#Deployer', () => {
    it('should save the correct contract address and constructor arguments to the Exchange artifact', async () => {
        const compiler = new Compiler(compilerOpts);
        await compiler.compileAllAsync();
        const deployer = new Deployer(deployerOpts);
        const exchangeConstructorArgs = [constants.zrxTokenAddress, constants.tokenTransferProxyAddress];
        const exchangeContractInstance = await deployer.deployAndSaveAsync('Exchange', exchangeConstructorArgs);
        const opts = {
            encoding: 'utf8',
        };
        const exchangeArtifactString = await fsWrapper.readFileAsync(exchangeArtifactPath, opts);
        const exchangeArtifact: ContractArtifact = JSON.parse(exchangeArtifactString);
        const exchangeContractData: ContractData = exchangeArtifact.networks[constants.networkId];
        const exchangeAddress = exchangeContractInstance.address;
        expect(exchangeAddress).to.be.equal(exchangeContractData.address);
        expect(constructor_args).to.be.equal(exchangeContractData.constructor_args);
    }).timeout(constants.timeoutMs);
});
