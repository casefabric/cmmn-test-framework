/**
 * Base class for classes in this folder.
 * Has a default toString that prints the instance in pretty printed json format
 */
 export default class CMMNBaseClass {
    toString() {
        return JSON.stringify(this, undefined, 2);
    }
}
