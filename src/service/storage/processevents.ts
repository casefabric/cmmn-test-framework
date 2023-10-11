import PlanItem from "../../cmmn/planitem";
import State from "../../cmmn/state";
import { assertPlanItem } from "../../test/caseassertions/plan";
import CaseEvents from "./caseevents";
import PlanItemEvents from "./planitemevents";

export default class ProcessEvents extends PlanItemEvents {
    constructor(item: PlanItem, public parentCase: CaseEvents) {
        super(parentCase.user, item, parentCase);
    }

    isArchived(): boolean {
        return this.hasArchiveEvent('ProcessArchived');
    }

    async assertState(state: State) {
        return assertPlanItem(this.user, this.parentCase.id, this.id, undefined, state);
    }
}
