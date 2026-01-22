import Trace from "./trace";

export default class AsyncError extends Error {
    constructor(public trace: Trace, public msg: string = '') {
        super(trace.toMessage(msg));
    }

    getMessage(fullTrace: boolean = true) {
        return this.trace.toMessage(this.msg, fullTrace);
    }
}
