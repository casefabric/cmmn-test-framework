import CMMNBaseClass from "./cmmnbaseclass";

/**
 * Wrapper for the discretionary items of a case.
 */
export default class DiscretionaryItem extends CMMNBaseClass {
    /**
     * 
     * @param name Name of the discretionary item
     * @param definitionId ID of the discretionary item inside the case definition
     * @param type Type of item (e.g., HumanTask or Stage)
     * @param parentName Name of the parent of the item (either the HumanTask or the Stage in which it is declared)
     * @param parentType Type of parent in which the item is declared (stage or humantask)
     * @param parentId Plan item id of the parent declaring the discretionary item
     */
    constructor(
        public name: string,
        public definitionId: string,
        public type: string,
        public parentName: string,
        public parentType: string,
        public parentId: string
    ) { super(); }
}