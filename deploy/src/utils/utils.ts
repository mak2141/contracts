export const utils = {
    consoleLog(message: string): void {
        console.log(message);
    },
    stringifyWithFormatting(obj: any): string {
        const jsonReplacer: null = null;
        const numberOfJsonSpaces = 4;
        const stringifiedObj = JSON.stringify(obj, jsonReplacer, numberOfJsonSpaces);
        return stringifiedObj;
    },
};
