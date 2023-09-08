/**
 * Generic wrapper for case file json.
 * Should probably become a class with some handy methods.
 */
export default interface CaseFile {
}

/**
 * Read a case file item from case file based on the path.
 * E.g. /Greeting/From or Order/Lines[3]/Item
 * @param caseFile 
 * @param path 
 */
export function pathReader(caseFile: any, path: string): any {
    return readPath(caseFile, path, path);
}

/**
 * Internal recursive function to read a path from the case file
 * @param caseFile 
 * @param path 
 * @param fullPath 
 */
function readPath(caseFile: any, path: string, fullPath: string): any {
    // console.log(`Reading path '${path}' from ${JSON.stringify(caseFile, undefined, 2)}`);

    if (caseFile === undefined) {
        // console.log('Cannot read next element in path, because case file is undefined');
        return undefined;
    }

    const splitPath = path.split('/');
    // if (splitPath.length == 0) {
    //     console.log("No path remains. Returning caseFile", caseFile);
    //     return caseFile;
    // }
    const child = readChild(caseFile, splitPath[0], fullPath);
    const remainingPathElements = splitPath.slice(1).filter(pathElement => pathElement.trim().length > 0);
    if (remainingPathElements.length == 0) {
        // console.log("NO remaining path, returning ", child)
        return child;
    }

    const remainingPath = remainingPathElements.join('/');
    return readPath(child, remainingPath, fullPath);
}

/**
 * Read a child from the case file. Parses path for array element accessor '[ ]'
 * @param caseFile 
 * @param childPath 
 * @param fullPath 
 */
function readChild(caseFile: any, childPath: string, fullPath: string): any {
    childPath = childPath.trim();
    if (childPath.length == 0) {
        return caseFile;
    }
    const isIndexed = childPath.indexOf('[');
    // Not an array, simply return the child.
    if (isIndexed <= 0) {
        return caseFile[childPath];
    }
    // Check whether it also ends with ']'
    if (childPath[childPath.length - 1] != ']') {
        throw new Error(`Path '${fullPath}' contains unended array accessor '${childPath}'`);
    }

    // Check whether [] contains a number
    const arrayElementNumber = childPath.substring(isIndexed + 1, childPath.length - 1);
    const index = Number.parseInt(arrayElementNumber);
    if (isNaN(index)) {
        throw new Error(`Path '${fullPath}' contains array accessor '${childPath}', but '${arrayElementNumber}' is not a number`);
    }

    // Check whether it is higher than -1
    if (index < 0) {
        throw new Error(`Path '${fullPath}' contains array accessor '${childPath}' but array index must be at least 0`);
    }

    // Read the child, and check whether it is an array
    const childName = childPath.substring(0, isIndexed);
    const expectedArray = caseFile[childName];
    if (!expectedArray) {
        return undefined;
    }
    if (!Array.isArray(expectedArray)) {
        throw new Error(`Path '${fullPath}' contains array accessor '${childPath}', but the '${childName}' element is not an array`);
    }
    if (index >= expectedArray.length) {
        return undefined;
    }
    return expectedArray[index];

}