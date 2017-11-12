declare module 'bn.js';
declare module 'ethereumjs-abi';
declare module 'chai-bignumber';
declare module 'dirty-chai';
declare module 'yargs';

// HACK: In order to merge the bignumber declaration added by chai-bignumber to the chai Assertion
// interface we must use `namespace` as the Chai definitelyTyped definition does. Since we otherwise
// disallow `namespace`, we disable tslint for the following.
/* tslint:disable */
declare namespace Chai {
    interface Assertion {
        bignumber: Assertion;
        // HACK: In order to comply with chai-as-promised we make eventually a `PromisedAssertion` not an `Assertion`
        eventually: PromisedAssertion;
    }
}
/* tslint:enable */

declare module '*.json' {
    const json: any;
    /* tslint:disable */
    export default json;
    /* tslint:enable */
}

declare module 'solc' {
    export function compile(sources: any, optimizerEnabled: number, findImports: (importPath: string) => any): any;
    export function setupMethods(solcBin: any): any;
}

declare module 'es6-promisify' {
    function promisify(original: any, settings?: any): ((...arg: any[]) => Promise<any>);
    export = promisify;
}

// Truffle injects the following into the global scope
declare var artifacts: any;
declare var contract: any;
declare var before: any;
declare var beforeEach: any;
declare var describe: any;
declare var it: any;
