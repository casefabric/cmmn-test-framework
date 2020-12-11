import CMMNDocumentation from "./cmmndocumentation";

/**
 * JSON Wrapper for case file item documentation in a case instance
 */
export default class CaseFileItemDocumentation {
    /**
     * 
     * @param path Plan item id
     * @param documentation Plan item name
     */
    constructor(
        public path: string,
        public documentation: CMMNDocumentation,
    ) { }

    toString() {
        return JSON.stringify(this, undefined, 2);
    }
}
