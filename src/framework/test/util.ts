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
}