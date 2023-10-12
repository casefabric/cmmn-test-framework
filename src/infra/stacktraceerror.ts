import AsyncError from "./asyncerror";

export default class StackTraceError extends Error {
    constructor(error: unknown, prefix: string = '', postfix: string = '') {
        super(prefix + printStackTrace(error) + postfix);
    }
}

function printStackTrace(error: unknown): string {
    if (error instanceof AsyncError) {
        return error.message;
    } else if (error instanceof Error) {
        return error.stack ? error.stack.split('\n').join('\n') : `${error.constructor.name}: ${error.message}`;
    } else if (error instanceof Object) {
        return `${error.constructor.name}: ${error}`;
    } else {
        return `${error}`;
    }
}
