import PlanItem from "../../cmmn/planitem";
import State from "../../cmmn/state";
import { PollUntilSuccess } from "../../test/time";
import User from "../../user";
import Trace from "../../util/async/trace";
import ActorEvents from "./actorevents";
import CaseEvents from "./caseevents";

export default class PlanItemEvents extends ActorEvents {
    public state: State;

    constructor(public user: User, item: PlanItem, public parentCase?: CaseEvents) {
        super(user, item.id, item.name);
        this.state = State.of(item.currentState);
    }

    async assertArchived(user: User = this.user, trace: Trace = new Trace()) {
        return await PollUntilSuccess(async () => {
            console.log("Checking that we're archived ...")
            await this.mustBeArchived(user, trace);
        })
    }

    protected hasArchiveEvent(archiveEventName: string): boolean {
        // Note: a sub case or sub process is archived when it is active.
        //  If it was in Available state, then there was no need to archive it, 
        //  and then there will not be any events (i.e. events.length === 0)
        if (this.events.length === 0) {
            return true;
        } else if (this.events.length === 1 && this.events[0].type === archiveEventName) {
            //  If archived, then there must be exactly one event, with the given event name.
            return true;
        } else {
            // So, it is not (yet?) archived ...
            return false;
        }
    }

    isArchived(): boolean {
        throw new Error(`This method must be implemented in ${this.constructor.name}`);
    }
}
