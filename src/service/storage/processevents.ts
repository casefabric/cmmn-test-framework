import PlanItem from "../../cmmn/planitem";
import State from "../../cmmn/state";
import Trace from "../../infra/trace";
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

    async assertState(state: State, trace: Trace = new Trace()) {
        return assertPlanItem(this.user, this.parentCase.id, this.id, undefined, state, trace);
    }
}
