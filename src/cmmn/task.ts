import CMMNBaseClass from "./cmmnbaseclass";

export default class Task extends CMMNBaseClass {
    constructor(
        public id: string,
        public taskName: string,
        public taskState: string,
        public assignee: string,
        public mayPerform: boolean,
        public owner: string,
        public caseInstanceId: string,
        public caseName: string,
        public tenant: string,
        public role: string,
        public lastModified: string,
        public modifiedBy: string,
        public dueDate: string,
        public createdOn: string,
        public createdBy: string,
        public input: any,
        public output: any,
        public taskModel: any
    ) { super(); }

    toString() {
        return `${this.taskName}[${this.id}]`;
    }

    summary() {
        return this.toString() + ` - ${this.taskState}`
    }

    isCompleted() {
        return this.taskState === 'Completed';
    }

    isAssigned() {
        return this.taskState === 'Assigned';
    }

    isActive() {
        return this.taskState !== 'Completed' && this.taskState !== 'Terminated';
    }

    /**
     * Returns true for Delegated, Unassigned and Assigned tasks.
     */
    static isActive(task: Task) {
        return task && task.isActive();
    }
}

export function taskPrinter(tasks: Task[]) {
    console.log(tasks.map(t => `Task [id = ${t.id} | name = ${t.taskName} | case = ${t.caseName} | state = ${t.taskState} | mayPerform = ${t.mayPerform}]`).join('\n'));
    return tasks;
}
