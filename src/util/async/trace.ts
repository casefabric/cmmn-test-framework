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
    toMessage(errorMessage: string, fullTrace: boolean = true): string {
        const lines = [...this.lines.slice(this.slice)];
        const filteredLines = fullTrace ? lines : lines.filter((error, index, errors) => filter(error, index, errors));
        return [errorMessage, ...filteredLines].join('\n');
    }
}

function convertErrorStackToLines(error: unknown) {
    if (error instanceof Error) {
        return error.stack ? error.stack.split('\n') : new Array<string>();
    } else {
        return new Array<string>();
    }
}

export type LineFilter = (line: string, index: number, trace: string[]) => boolean;

function filter(line: string, index: number, trace: string[]): boolean {
    const awaiterMessage = trace.find(msg => msg.indexOf('at __awaiter (') >= 0);
    const awaiterLocation = awaiterMessage ? trace.indexOf(awaiterMessage) : -1;
    const isGeneratorMessage = line.indexOf('Generator.next') >= 0;
    // console.log(`${index} | AL: ${awaiterLocation}; ${index > 0 && index <= awaiterLocation} / gen: ${isGeneratorMessage}| msg ${line}`);
    return !isGeneratorMessage && !(index > 0 && index <= awaiterLocation);
}
