import Trace from "./trace";
import CafienneResponse from "../service/response";

export default class AsyncError extends Error {
    constructor(trace: Trace, msg: string = '') {
        super(trace.toMessage(msg));
    }
}

export class AsyncEngineError extends AsyncError {
    constructor(trace: Trace, msg: string = '', public response: CafienneResponse) {
        super(trace, msg);
    }
}
