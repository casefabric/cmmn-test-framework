import { readdirSync, statSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const directoryPath = join(process.cwd(), './src');

const exclusionPatterns = [
    /^\.\/mock\//,
];

function extractClassNames(filePath) {
    const fileContent = readFileSync(filePath, 'utf-8');
    const defaultPattern = /export\s+(default\s+)(class\s+|interface\s+|(async\s+)?function\s+)?(\w+)/g;
    const pattern = /export\s+(class|interface|(async\s+)?function)\s+(\w+)/g;
    const names = [];
    let match;

    const defaultMatch = defaultPattern.exec(fileContent);
    if (defaultMatch !== null) {
        names.push(defaultMatch[4]);
    }
    else {
        names.push(null);
    }


    while ((match = pattern.exec(fileContent)) !== null) {
        names.push(match[3]);
    }
    return names;
}

function generateExports(dirPath, relativeFolder = '.') {
    let exports = '';

    const files = readdirSync(dirPath);
    files.forEach(file => {
        const relativeFilePath = [relativeFolder, file].join('/')

        if (exclusionPatterns.some(pattern => pattern.test(relativeFilePath))) {
            return exports;
        }

        const filePath = join(dirPath, file);
        const stat = statSync(filePath);

        const scriptFilePattern = /(\.ts)|(\.js)$/;
        if (stat.isDirectory()) {
            exports += generateExports(filePath, relativeFilePath);
        } else if (stat.isFile() &&
            file.match(scriptFilePattern) &&
            !file.endsWith('.d.ts') && file !== 'index.ts' &&
            !file.endsWith('.d.js') && file !== 'index.js') {
            const modulePath = relativeFilePath.replace(scriptFilePattern, '');

            const names = extractClassNames(filePath);
            if (names.length === 0) {
                return;
            }

            const namesString = ``;
            if (names[0] !== null) {
                names[0] = `default as ${names[0]}`;
            }
            else {
                names.shift();
            }

            if (names.length > 0) {
                exports += `export { ${names.join(", ")} } from "${modulePath}";\n`;
            }
        }
    });

    return exports;
}

const exports = generateExports(directoryPath);
writeFileSync(join(directoryPath, './index.ts'), exports);