const csvToJson = require('convert-csv-to-json');

csvToJson.fieldDelimiter(',').generateJsonFileFromCsv('data.csv', 'data.json');

// let csvData = csvToJson.fieldDelimiter(',').getJsonFromCsv('data.csv');
// console.log(csvData);