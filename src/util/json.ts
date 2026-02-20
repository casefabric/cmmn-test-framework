export type Constructor<T> = new (...args: any[]) => T;

/**
 * Invokes parseTypedObject on each element in the array
 */
export function addTypes<T>(json: any[], returnType: Constructor<T>): T[] {
    return json && json.map(item => addType(item, returnType));
}

/**
 * Assigns the class T to a raw json object and returns the object as an instancoe of type T.
 */
export function addType<T>(json: any, returnType: Constructor<T>): T {
    // console.log("JSON is " + JSON.stringify(json, undefined, 2))
    // console.log("\n\n Return type is " , returnType)

    if (json === null || json === undefined) return json;
    // Assign the class to the json.
    Object.setPrototypeOf(json, returnType.prototype);

    // Check if the class has an initializer method called 'init_json'
    // Note: using "in" vs. "hasOwnProperty" makes quite a difference:
    //  with "in" it is possible to make an init_json function in a base class,
    //  without having to override it in a subclass.
    if ('init_json' in returnType.prototype) {
        const init_json = (returnType.prototype as any).init_json;
        if (init_json && typeof init_json === 'function') {
            init_json.call(json);
        }
    }
    return json;
}
