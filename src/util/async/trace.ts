/**
 * A class that sort of kind of keeps track of the stacktrace at the moment it is instantiated.
 * This can be used to capture the moment an async function is invoked that leads to an error on the callback to print the location of invocation of the async function.
 */
export default class Trace {
    lines: Array<string>;

    /**
     * Create a stack trace at the moment the constructor is called.
     * By default the first 2 lines are removed, as they are generated from the implementation inside the constructor of the Trace.
     * @param slice Indicates the number of lines to be removed from the stacktrace array.
     */
    constructor(public slice: number = 2) {
        try {
            throw new Error('current location');
        } catch (error) {
            this.lines = convertErrorStackToLines(error);
        }
    }

    /**
     * Returns a string with a stack trace of the moment this Trace was created.
     */
    toMessage(errorMessage: string): string {
        return [errorMessage, ...this.lines.slice(this.slice)].join('\n');
    }
}

function convertErrorStackToLines(error: unknown) {
    if (error instanceof Error) {
        return error.stack ? error.stack.split('\n') : new Array<string>();
    } else {
        return new Array<string>();
    }
}
