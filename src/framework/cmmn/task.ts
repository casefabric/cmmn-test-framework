
export default class Task {
    id: string = '';
    taskName: string = '';
    taskState: string = '';
    assignee: string = '';
    owner: string = '';
    caseInstanceId: string = '';
    tenant: string = '';
    role: string = '';
    lastModified: string = '';
    modifiedBy: string = '';
    dueDate: string = '';
    createdOn: string = '';
    createdBy: string = '';
    input: any = {};
    output: any = {};

    constructor(json: any) {
        // Copy and fill our properties from the json.
        for (const key in this) {
            if (Object.getOwnPropertyNames(this).indexOf(key) >= 0) {
                this[key] = json[key];
            }
        }
    }

    toString() {
        return this.taskName + '[' + this.id + ']';
    }

    isCompleted() {
        return this.taskState === 'Completed';
    }

    isAssigned() {
        return this.taskState === 'Assigned';
    }
}
