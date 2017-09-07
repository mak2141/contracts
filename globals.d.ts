declare module 'bn.js';
declare module 'ethereumjs-abi';

declare module '*.json' {
    const json: any;
    /* tslint:disable */
    export default json;
    /* tslint:enable */
}

// Truffle injects the following into the global scope
declare var web3: any; // TODO: figure out how to use Web3 definition from within global.d.ts instead of `any`
declare var artifacts: any;
declare var contract: any;
declare var before: any;
declare var beforeEach: any;
declare var describe: any;
declare var it: any;

declare module 'solc' {
    function compile(sources: any, optimizerEnabled: number, findImports: (importPath: string) => any): any;
    function setupMethods(solcBin: any): any;
    export = {
        compile,
        setupMethods,
    };
}

declare module 'es6-promisify' {
    function promisify(original: any, settings?: any): ((...arg: any[]) => Promise<any>);
    export = promisify;
}
