import Trace from "./trace";

export default class AsyncError extends Error {
    constructor(trace: Trace, msg: string = '') {
        super(trace.toMessage(msg));
    }
}
