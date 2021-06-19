import CMMNBaseClass from "./cmmnbaseclass";

/**
 * JSON Wrapper for plan item documentation in a case instance
 */
export default class CMMNDocumentation extends CMMNBaseClass {
    /**
     * 
     * @param text Plan item id
     * @param textFormat Plan item name
     */
    constructor(
        public text: string,
        public textFormat: string,
    ) { super() }
}
