import CMMNBaseClass from "./cmmnbaseclass";

/**
 * JSON Wrapper for plan items in a case instance
 */
export default class PlanItem extends CMMNBaseClass {
    /**
     * 
     * @param id Plan item id
     * @param name Plan item name
     * @param stageId Id of the stage to which this plan item belongs, or empty if it is the CasePlan itself.
     * @param type Type of plan item. E.g. HumanTask, Milestone, Stage, TimerEvent, UserEvent, ProcessTask, CaseTask, CasePlan.
     * @param currentState Current state of plan item. E.g. Available, Active, Completed, Terminated, Suspended, Failed
     * @param historyState Previous state of the plan item
     * @param transition Transition through which the plan item reached current state. E.g., create, start, complete, fault, exit, etc.
     * @param isRequired Indicates whether this plan item is required in order for it's parent stage to be able to complete
     * @param isRepeating Indicates whether a new instance of this plan item must be created when this one completes or terminates.
     * @param index If a plan item repeats, index gives the instance version, starting off 0
     * @param lastModified Timestamp when the plan item was last modified
     * @param modifiedBy Id of user that caused last modification on the plan item.
     */
    constructor(
        public id: string,
        public name: string,
        public stageId: string,
        public type: string,
        public currentState: string,
        public historyState: string,
        public transition: string,
        public isRequired: boolean,
        public isRepeating: boolean,
        public index: number,
        public lastModified: string,
        public modifiedBy: string
    ) { super() }
}
