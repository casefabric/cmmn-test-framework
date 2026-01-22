import { addType } from "../util/json";
import CMMNBaseClass from "./cmmnbaseclass";
import CMMNDocumentation from "./cmmndocumentation";

/**
 * JSON Wrapper for case file item documentation in a case instance
 */
export default class CaseFileItemDocumentation extends CMMNBaseClass {
    public path: string = ''
    public documentation! : CMMNDocumentation

    init_json() {
        this.documentation = addType(this.documentation, CMMNDocumentation);
    }
}
