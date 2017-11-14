import * as fs from 'fs';
import promisify = require('es6-promisify');

export const readdirAsync = promisify(fs.readdir);
export const readFileAsync = promisify(fs.readFile);
export const writeFileAsync = promisify(fs.writeFile);
export const mkdirAsync = promisify(fs.mkdir);
export const doesPathExistSync = fs.existsSync;
export const removeDirAsync = promisify(fs.rmdir);
