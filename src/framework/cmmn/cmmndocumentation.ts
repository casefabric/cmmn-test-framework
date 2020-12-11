/**
 * JSON Wrapper for plan item documentation in a case instance
 */
export default class CMMNDocumentation {
    /**
     * 
     * @param text Plan item id
     * @param textFormat Plan item name
     */
    constructor(
        public text: string,
        public textFormat: string,
    ) { }

    toString() {
        return JSON.stringify(this, undefined, 2);
    }
}
