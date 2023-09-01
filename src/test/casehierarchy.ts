import Case from "../cmmn/case";
import PlanItem from "../cmmn/planitem";
import State from "../cmmn/state";
import CaseService from "../service/case/caseservice";
import DebugService from "../service/case/debugservice";
import { assertCasePlan, assertPlanItem } from "./caseassertions/plan";
import { PollUntilSuccess } from "./time";
import User from "../user";

export class ActorIdentifier {
    public events: Array<any> = [];
    public id: string;
    public name: string;
    public state: State;

    constructor(public user: User, item: PlanItem, public type: string = item.type, public parentCase?: CaseHierarchy) {
        this.id = item.id;
        this.name = item.name;
        this.state = State.of(item.currentState);
    }

    async mustBeArchived(user: User = this.user) {
        await this.loadEvents(user);
        if (!this.isArchived()) {
            console.log("Found unexpected events: " + JSON.stringify(this.events, undefined, 2));
            throw new Error(`${this.type} ${this.id} is not found in archived state`);
        }
    }

    async assertArchived() {
        return await PollUntilSuccess(async () => {
            console.log("Checking that we're archived ...")
            await this.mustBeArchived();
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

    async loadEvents(user: User = this.user) {
        const response: any = await DebugService.getEvents(this.id, user).then(data => (data.asJSON() as any));
        if (!response.body) {
            console.log('Expected a response with a body, but received something else', response);
            throw new Error('Expected a response with a body, but received something else');
        }
        this.events = [];
        this.events.push(...response.body)
    }

    print(indent: string): string {
        return this.description(indent);
    }

    description(indent: string): string {
        if (this.parentCase) {
            return `${indent} - ${this.type}['${this.name}' - ${this.state}] - ${this.id}`;
        } else {
            return `${this.type}['${this.name}' - ${this.state}] - ${this.id}`;
        }
    }

    printEvents(indent: string): string {
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

export class ProcessIdentifier extends ActorIdentifier {
    constructor(item: PlanItem, public parentCase: CaseHierarchy) {
        super(parentCase.user, item, 'Process', parentCase);
    }

    isArchived(): boolean {
        return this.hasArchiveEvent('ProcessArchived');
    }

    async assertState(state: State) {
        return assertPlanItem(this.user, this.parentCase.id, this.id, undefined, state);
    }
}

/**
 * CaseHierarchy enables building a hierarchy of a case with it's CaseTasks and ProcessTasks.
 */
export default class CaseHierarchy extends ActorIdentifier {
    static from(user: User, caseInstance: Case): CaseHierarchy {
        const fakedItem = new PlanItem(caseInstance.id, caseInstance.caseName, '', 'CaseTask', caseInstance.state, '', '', false, false, 0, caseInstance.lastModified, caseInstance.createdBy);
        return new CaseHierarchy(user, fakedItem);
    }

    cases: Array<CaseHierarchy> = [];
    processes: Array<ProcessIdentifier> = [];

    private constructor(public user: User, item: PlanItem, public parentCase?: CaseHierarchy) {
        super(user, item, 'Case', parentCase);
    }

    async load() {
        // reset state of children.
        this.cases = [];
        this.processes = [];
        if (this.state.is(State.Available)) {
            return; // no need to load more details, as the plan item is not yet active
        }
        const caseInstance = await assertCasePlan(this.user, this.id, this.state) as Case;

        // Add sub cases
        const caseTasks = caseInstance.planitems.filter(item => item.type === 'CaseTask');
        for (const subCase of caseTasks) {
            await this.addCase(subCase).load();
        }

        // Now add process tasks to the list
        caseInstance.planitems.filter(item => item.type === 'ProcessTask').map(item => this.processes.push(new ProcessIdentifier(item, this)));
    }

    addCase(subCase: PlanItem): CaseHierarchy {
        const subCaseHierarchy = new CaseHierarchy(this.user, subCase, this);
        this.cases.push(subCaseHierarchy);
        return subCaseHierarchy;
    }

    findItem(name: string, type?: string): ActorIdentifier|undefined {
        const matches = (task: ActorIdentifier) => task.name === name && (!type || task.type === type);

        // Check if we ourselves match.
        if (matches(this)) return this;

        // Check if one of our process tasks matches
        const processTask = this.processes.find(matches);
        if (processTask) return processTask;

        // Search the item in our sub cases
        for (const subCase of this.cases) {
            const task = subCase.findItem(name, type);
            if (task) return task;
        } 
    }

    findProcessTask(name: string): ProcessIdentifier|undefined {
        const task = this.findItem(name, 'Process');
        console.log("Foudn task named " + name +": " + task?.constructor.name)
        if (task && task instanceof ProcessIdentifier) return task;
        return undefined;
    }

    private collect<T>(collector: (a: ActorIdentifier) => T): Array<T> {
        const list: Array<T> = [];
        list.push(...this.cases.map(collector));
        list.push(...this.processes.map(collector));
        return list;
    }

    print(indent: string = ''): string {
        const list: Array<string> = this.collect(c => c.print(indent + ' '));
        return `${super.print(indent)}${list.length ? '\n' + list.join('\n') : ''}`;
    }

    printEvents(indent: string = ''): string {
        const list: Array<string> = this.collect(c => c.printEvents(indent + ' '));
        return `${super.printEvents(indent)}${list.length ? `\n${list.join('\n')}` : ''}`;
    }

    async loadEventHierarchy(): Promise<void> {
        await super.loadEvents();
        for (const subCase of this.cases) {
            await subCase.loadEventHierarchy();
        }
        for (const subProcess of this.processes) {
            await subProcess.loadEvents();
        }
    }

    get totalEventCount(): number {
        return super.totalEventCount + this.collect(t => t.totalEventCount).reduce((sum, count) => sum + count, 0);
    }

    hasArchivedHierarchy(): boolean {
        if (!this.isArchived()) {
            return false;
        }
        if (this.cases.find(c => !c.hasArchivedHierarchy())) return false;
        return this.processes.find(p => !p.isArchived()) === undefined;
    }

    isArchived(): boolean {
        return this.hasArchiveEvent('CaseArchived');
    }

    async assertRestored() {
        return await PollUntilSuccess(async () => {
            console.log("Checking that we're restored ...")
            await CaseService.getDiscretionaryItems(this.user, this.id);
        })
    }

    toString(): string {
        return this.print('');
    }
}
