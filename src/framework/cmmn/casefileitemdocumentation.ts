import CMMNBaseClass from "./cmmnbaseclass";
import CMMNDocumentation from "./cmmndocumentation";

/**
 * JSON Wrapper for case file item documentation in a case instance
 */
export default class CaseFileItemDocumentation extends CMMNBaseClass {
    /**
     * 
     * @param path Plan item id
     * @param documentation Plan item name
     */
    constructor(
        public path: string,
        public documentation: CMMNDocumentation,
    ) { super(); }
}
