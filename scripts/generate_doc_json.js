const _ = require('lodash');
const fs = require('fs');

const DOC_JSONS_DIR = `${__dirname}/doxity/pages/docs`;
const FINAL_DOC_FILE_PATH = `${DOC_JSONS_DIR}/v1.0.0.json`;

// Remove finalDoc json if exists
if (fs.existsSync(FINAL_DOC_FILE_PATH)) {
    fs.unlinkSync(FINAL_DOC_FILE_PATH);
}

const finalDocJSON = {};

// For each .json file in dir, add it with name as key to final JSON
const fileNames = fs.readdirSync(DOC_JSONS_DIR);
const jsonFiles = _.filter(fileNames, fileName => _.includes(fileName, '.json'));

for (jsonFile of jsonFiles) {
    const contentString = fs.readFileSync(`${DOC_JSONS_DIR}/${jsonFile}`).toString();
    const content = JSON.parse(contentString);
    delete content.source; // Remove source
    finalDocJSON[content.name] = content;
}

const finalDocString = JSON.stringify(finalDocJSON);
fs.writeFileSync(FINAL_DOC_FILE_PATH, finalDocString);
console.log('Successfully generated Doc JSON');
