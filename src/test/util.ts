import Trace from "../infra/trace";
import AsyncError from "../infra/asyncerror";

/**
 * Few simple util functions
 */
export default class Util {
    /**
     * Simple deep-cloner for an object
     * @param object 
     */
    static clone(object: any) {
        return JSON.parse(JSON.stringify(object));
    }

    /**
     * Generate a random string
     * @returns 
     */
    static get randomString(): string {
        // toString(36) generates numbers [0...9] and letters [a...z]
        // Substring(2, 14) removes "0." prefix at the beginning, resulting in a string of length 11.
        return Math.random().toString(36).substring(2, 14) + Math.random().toString(36).substring(2, 14);
    }

    /**
     * Generate an id with specified pre- and postfix and inbetween a guid of the specified length, defaulting to 11
     * Note: there is no limit to length, it keeps generating strings until length is reached...
     */
    static generateId(prefix: string = '', length: number = 11, postfix: string = ''): string {
        let id = Util.randomString;
        while (id.length < length) id = id + Util.randomString;
        return prefix + id.substring(0, length) + postfix;
    }

    /**
     * Generate amount of ids with the prefix, length and postfix.
     */
    static generateIds(amount: number, prefix: string = '', length: number = 11, postfix: string = ''): Array<string> {
        const ids: Array<string> = [];
        while (amount--) ids.push(Util.generateId(prefix, length, postfix));
        return ids;
    }

    /**
     * Generate a random id, with a optional prefix and postfix
     * @param prefix 
     * @param postfix 
     * @returns 
     */
    static generateString(prefix: string = '', postfix: string = ''): string {
        return prefix + Util.randomString + postfix;
    }

    /**
     * Converts a raw json object into an instance of the given return type.
     * @param errorMsg 
     * @param json 
     * @param returnType 
     * @param trace 
     */
    static convertJsonToTypedObject(errorMsg: string = '', json: any, returnType?: Function | Array<Function>, trace: Trace = new Trace()) {
        if (returnType) {
            // console.log("Response is " + JSON.stringify(json, undefined, 2))
            // console.log("\n\n Return type is " , returnType)
            if (returnType instanceof Array) {
                if (returnType.length == 0) {
                    if (!errorMsg) {
                        errorMsg = 'Return type must have at least 1 element';
                    }
                    throw new AsyncError(trace, errorMsg);
                }
                if (json instanceof Array) {
                    const array = <Array<object>>json;
                    return array.map(item => this.convertToTypedObject(item, returnType[0]));
                } else {
                    if (!errorMsg) {
                        errorMsg = `Expected a json array with objects of type ${returnType[0].name}, but the response was not an array: ${JSON.stringify(json, undefined, 2)}`;
                    }
                    throw new AsyncError(trace, errorMsg);
                }
            } else if (returnType !== undefined) {
                this.convertToTypedObject(json, returnType);
            }
        }
        return json;
    }

    static convertToTypedObject(json: any, returnType: Function) {
        Object.setPrototypeOf(json, returnType.prototype);
        if (returnType.prototype.hasOwnProperty('init_json')) {
            const init_json = (returnType.prototype as any).init_json;
            if (init_json && typeof init_json === 'function') {
                init_json.call(json);
            }
        }
        return json;
    }
}

/**
 * Run an async method over an array in a "forEach" style
 * @param array 
 * @param asyncLogic 
 */
export async function asyncForEach<T, R>(array: T[], asyncLogic: (item: T, index: number, array: any[]) => Promise<R>) {
    for (let index = 0; index < array.length; index++) {
        await asyncLogic(array[index], index, array);
    }
}

/**
 * Mechanism to do typed printing of an object
 * @param obj 
 * @param label 
 * @param indent 
 */
export function printObject(obj: any, label: string, indent: string = '') {
    if (obj === null || obj === undefined) {
        console.log(indent + obj);
    } else {
        if (typeof obj !== 'object') {
            console.log(indent + ' - ' + label + ' (' + obj.constructor.name + '): ' + obj);
        } else {
            console.log(indent + ' - ' + label + ' (' + obj.constructor.name + '): ');
            Object.keys(obj).forEach(key => {
                printObject(obj[key], key, indent + '  ');
            });
        }
    }
}