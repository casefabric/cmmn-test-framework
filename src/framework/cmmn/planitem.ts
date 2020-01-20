/**
 * JSON Wrapper for plan items in a case instance
 */
export default interface PlanItem {
    /**
     * Plan item id
     */
    id: string;
    /**
     * Plan item name
     */
    name: string;
    /**
     * Id of the stage to which this plan item belongs, or empty if it is the CasePlan itself.
     */
    stageId: string;
    /**
     * Type of plan item. E.g. HumanTask, Milestone, Stage, TimerEvent, UserEvent, ProcessTask, CaseTask, CasePlan.
     */
    type: string;
    /**
     * Current state of plan item. E.g. Available, Active, Completed, Terminated, Suspended, Failed
     */
    currentState: string;
    /**
     * Previous state of the plan item
     */
    historyState: string;
    /**
     * Transition through which the plan item reached current state. E.g., create, start, complete, fault, exit, etc.
     */
    transition: string;

    /**
     * Indicates whether this plan item is required in order for it's parent stage to be able to complete
     */
    isRequired: boolean;
    /**
     * Indicates whether a new instance of this plan item must be created when this one completes or terminates.
     */
    isRepeating: boolean;
    /**
     * If a plan item repeats, index gives the instance version, starting off 0
     */
    index: number;

    /**
     * Timestamp when the plan item was last modified
     */
    lastModified: string;
    /**
     * Id of user that caused last modification on the plan item.
     */
    modifiedBy: string;
}
