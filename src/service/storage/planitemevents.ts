import PlanItem from "../../cmmn/planitem";
import State from "../../cmmn/state";
import AsyncError from "../../infra/asyncerror";
import Trace from "../../infra/trace";
import { PollUntilSuccess } from "../../test/time";
import User from "../../user";
import ActorEvents from "./actorevents";
import CaseEvents from "./caseevents";

export default class PlanItemEvents extends ActorEvents {
    public state: State;

    constructor(public user: User, item: PlanItem, public parentCase?: CaseEvents) {
        super(user, item.id, item.name);
        this.state = State.of(item.currentState);
    }

    async mustBeArchived(user: User = this.user, trace: Trace = new Trace()) {
        await this.loadEvents(user);
        if (!this.isArchived()) {
            console.log("Found unexpected events: " + JSON.stringify(this.events, undefined, 2));
            throw new AsyncError(trace, `${this.type} ${this.id} is not found in archived state`);
        }
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
