import * as Web3 from 'web3';
import promisify = require('es6-promisify');

export async function getNetworkIdIfExistsAsync(port: number): Promise<number> {
    const url = `http://localhost:${port}`;
    const web3Provider = new Web3.providers.HttpProvider(url);
    const web3 = new Web3(web3Provider);
    try {
        const networkIdIfExists = await promisify(web3.version.getNetwork)();
        return networkIdIfExists;
    } catch (err) {
        throw err;
    }
}
