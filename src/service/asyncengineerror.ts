import AsyncError from "../util/async/asyncerror";
import Trace from "../util/async/trace";
import CafienneResponse from "./response";

export default class AsyncEngineError extends AsyncError {
    constructor(trace: Trace, msg: string = '', public response: CafienneResponse) {
        super(trace, msg);
    }
}
