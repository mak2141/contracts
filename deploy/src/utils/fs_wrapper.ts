import * as fs from 'fs';
import promisify = require('es6-promisify');

export const fsWrapper = {
    readdirAsync: promisify(fs.readdir),
    readFileAsync: promisify(fs.readFile),
    writeFileAsync: promisify(fs.writeFile),
    mkdirAsync: promisify(fs.mkdir),
    doesPathExistSync: fs.existsSync,
    removeFileAsync: promisify(fs.unlink),
};
