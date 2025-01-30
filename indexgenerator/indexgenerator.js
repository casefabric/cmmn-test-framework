const { readdirSync, writeFileSync, statSync, readFileSync, existsSync } = require('fs');
const { join } = require('path');

const IndexableFile = require('./indexablefile.js').IndexableFile;

const exclusionPatterns = [
    /^\.\/mock\//,
    /repositoryservice.ts/,
    /definitions.ts/,
    /linereader.ts/,
    /testcase.ts/,
];

class IndexGenerator {
    /**
     * @param {String} targetDirectory 
     * @param  {String[]} rootDirectories 
     */
    constructor(targetDirectory, ...rootDirectories) {
        this.targetDirectory = targetDirectory;
        if (rootDirectories.indexOf(targetDirectory) < 0) {
            rootDirectories.push(targetDirectory);
        }
        this.rootDirectories = rootDirectories;
        this.files = (/**@type {Array<IndexableFile>} */[]);
    }

    collectFiles() {
        this.rootDirectories.forEach(directory => this.readDirectoryContents(directory, '.'));
    }

    /**
     * 
     * @param {String} directory 
     * @param {String} relativeDirectory 
     */
    readDirectoryContents(directory, relativeDirectory) {
        const entries = readdirSync(directory);
        entries.forEach(entry => {
            const relativePath = [relativeDirectory, entry].join('/');
            if (exclusionPatterns.some(pattern => pattern.test(relativePath))) {
                return;
            }
            const filePath = join(directory, entry);
            const stat = statSync(filePath);

            if (stat.isDirectory()) {
                this.readDirectoryContents(filePath, relativePath);
            } else if (stat.isFile()) {
                this.files.push(new IndexableFile(this, filePath, relativePath));
            }
        });
    }

    generateExportStatements() {
        this.files.forEach(file => file.detectExports());
        this.exportStatements = this.files.map(file => file.generateStatement()).join('');
    }

    writeIndexFile() {
        const fileName = join(this.targetDirectory, './index.ts');
        const newContents = this.exportStatements;
        if (existsSync(fileName)) {
            const existingContents = readFileSync(fileName).toString();
            if (existingContents === newContents) {
                console.log("File index.ts does not change; skipping write process");
                return false;
            } else {
                console.log("Writing updated index.ts file");
                writeFileSync(fileName, newContents);
            }

        } else {
            console.log("Writing new index.ts file");
            writeFileSync(fileName, newContents);
        }
        return true;
    }
}

exports.IndexGenerator = IndexGenerator;
