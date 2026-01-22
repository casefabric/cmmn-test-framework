import AsyncError from "./asyncerror";

export default class StackTraceError extends Error {
    constructor(error: unknown, prefix: string = '', postfix: string = '', fullTrace: boolean = true) {
        super(prefix + printStackTrace(error, fullTrace) + postfix);
    }
}

function printStackTrace(error: unknown, fullTrace: boolean): string {
    if (error instanceof AsyncError) {
        return error.getMessage(fullTrace);
    } else if (error instanceof Error) {
        return error.stack ? error.stack.split('\n').join('\n') : `${error.constructor.name}: ${error.message}`;
    } else if (error instanceof Object) {
        return `${error.constructor.name}: ${error}`;
    } else {
        return `${error}`;
    }
}
