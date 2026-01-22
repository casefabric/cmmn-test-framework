import { PollUntilSuccess } from "../../test/time";
import User from "../../user";
import AsyncError from "../../util/async/asyncerror";
import Trace from "../../util/async/trace";
import DebugService from "../case/debugservice";

/**
 * Base class to retrieve the events of the actor from the event journal
 */
export default class ActorEvents {
    public events: Array<any> = [];
    public type: string;

    constructor(public user: User, public id: string, public name: string = id) {
        this.type = this.constructor.name.split('Events')[0];
    }

    toString() {
        return `${this.type} ${this.id}`;
    }

    async mustBeArchived(user: User = this.user, trace: Trace = new Trace()) {
        await this.loadEvents(user, trace);
        if (!this.isArchived()) {
            console.log("Found unexpected events: " + JSON.stringify(this.events, undefined, 2));
            throw new AsyncError(trace, `${this} is not found in archived state`);
        }
    }

    async assertArchived(user: User = this.user, trace: Trace = new Trace()) {
        return await PollUntilSuccess(async () => {
            console.log(`Checking that ${this} is archived ...`)
            await this.mustBeArchived(user, trace);
        })
    }

    async assertDeleted(user: User = this.user, trace: Trace = new Trace(), loader: Function = async () => await this.loadEvents(user, trace)) {
        return await PollUntilSuccess(async () => {
            console.log(`Checking that ${this} is deleted ...`)
            await loader();
            if (this.totalEventCount > 0) {
              throw new AsyncError(trace, `Did not expect to find any events in ${this}, but found ${this.totalEventCount}:\n${this.printEvents()}`)
            }
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

    async loadEvents(user: User = this.user, trace: Trace = new Trace()) {
        const response: any = await DebugService.getEvents(this.id, user).then(data => (data.asJSON() as any));
        if (!response.body) {
            console.log('Expected a response with a body, but received something else', response);
            throw new AsyncError(trace, 'Expected a response with a body, but received something else');
        }
        this.events = [];
        this.events.push(...response.body)
    }

    print(indent: string): string {
        return this.description(indent);
    }

    description(indent: string): string {
        if (this.name === this.id) {
            return `${this.type}[${this.id}]`;
        } else {
            return `${this.type}['${this.name}' - ${this.id}]`;
        }
    }

    printEvents(indent: string = ''): string {
        const eventDescriber = (event: any) => `${event.type}`;
        const list = () => {
            if (this.events.length === 1) {
                return eventDescriber(this.events[0]);
            } else if (this.events.length) {
                return this.events.map(eventDescriber).join(', ');
            } else {
                return '';
            }
        }
        return `${this.description(indent)}\n${indent}   events: [${list()}]`;
    }

    get totalEventCount(): number {
        return this.events.length;
    }
}
