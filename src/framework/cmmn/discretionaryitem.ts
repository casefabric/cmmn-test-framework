/**
 * Wrapper for the discretionary items of a case.
 */
export default interface DiscretionaryItem {
    /**
     * Name of the discretionary item
     */
    name: string;
    /**
     * ID of the discretionary item inside the case definition
     */
    definitionId: string;
    /**
     * Type of item (e.g., HumanTask or Stage)
     */
    type: string;
    /**
     * Name of the parent of the item (either the HumanTask or the Stage in which it is declared)
     */
    parentName: string;
    /**
     * Type of parent in which the item is declared.
     */
    parentType: string;
    /**
     * Plan item id of the parent declaring the discretionary item
     */
    parentId: string;
}