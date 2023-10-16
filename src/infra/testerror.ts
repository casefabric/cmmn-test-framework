import StackTraceError from "./stacktraceerror";

export default class TestError extends StackTraceError {
    constructor(public error: unknown, message: string) {
        super(error, message, '\n');
    }
}
