import { join } from 'path';
import { IndexGenerator } from './indexgenerator.js';

const directoryPath = join(process.cwd(), './src');

console.group("======== Generating index.js file")
const generator = new IndexGenerator(directoryPath);
console.log("Collecting source files inside " + directoryPath);
generator.collectFiles();
console.log("Generating export statements");
generator.generateExportStatements();
const fileWritten = generator.writeIndexFile();
console.groupEnd()
console.log("======== Completed index generation process")

// Fail when writing file but parameter failOnWrite (used in CircleCi build)
if (fileWritten && process.argv.length > 2 && process.argv[2] == '-failOnWrite')
    process.exit(1);
else
    process.exit();
