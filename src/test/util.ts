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
     * Generate a random id
     * @returns 
     */
     static get randomString(): string {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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
}
