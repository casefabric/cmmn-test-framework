import PlanItem from "../../cmmn/planitem";
import State from "../../cmmn/state";
import Path from "../../service/case/path";

export default class StateAssertion {
    public identifier: Path;
    constructor(path: Path | string | PlanItem, public expectedState: State) {
        if (path instanceof PlanItem) {
            this.identifier = Path.from(path.id);
        } else {
            this.identifier = Path.from(path);
        }
    }

    run(item: PlanItem) {
        if (! this.expectedState.is(item.currentState)) {
            throw new Error(`Expected plan item "${this.identifier}" in state ${this.expectedState} but found it in state ${item.currentState}`);
        }
    }

    toString() {
        return `"${this.identifier}.currentState === ${this.expectedState}"`;
    }
}
