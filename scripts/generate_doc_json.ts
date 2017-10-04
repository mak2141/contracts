import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import * as child from 'child_process';

const tempDir = path.resolve('temporary');
const DOC_JSONS_DIR = `${tempDir}/doxity/pages/docs`;

const stdout = child.execSync('git tag');
const version = stdout.toString('utf8');
const FINAL_DOC_FILE_PATH = `${DOC_JSONS_DIR}/v${version}.json`;

// Remove finalDoc json if exists
if (fs.existsSync(FINAL_DOC_FILE_PATH)) {
    fs.unlinkSync(FINAL_DOC_FILE_PATH);
}

const finalDocJSON: {[contractName: string]: any} = {};

// For each .json file in dir, add it with name as key to final JSON
const fileNames = fs.readdirSync(DOC_JSONS_DIR);
const jsonFiles = _.filter(fileNames, fileName => _.includes(fileName, '.json'));

for (const jsonFile of jsonFiles) {
    const contentString = fs.readFileSync(`${DOC_JSONS_DIR}/${jsonFile}`).toString();
    const content = JSON.parse(contentString);
    delete content.source; // Remove source
    finalDocJSON[content.name] = content;
}

const finalDocString = JSON.stringify(finalDocJSON);
fs.writeFileSync(FINAL_DOC_FILE_PATH, finalDocString);
// tslint:disable-next-line: no-console
console.log('Successfully generated Doc JSON');
