import BoardTeam from "./boardteam";
import ColumnDefinition from "./columndefinition";

/**
 * Wrapper for the CreateBoard command 
 */
export default class BoardDefinition {
    public columns: Array<ColumnDefinition> = [];

    public team: BoardTeam = new BoardTeam();

    /**
     * 
     * @param title Title of the board to create
     * @param form Optional form that the board can use to start a flow
     * @param id Optional id for the board to create. If not specified, the server will create one.
     */
    constructor(public title: string, public form?: object, public id?: string) { }

    toString() {
        return this.id;
    }

    toJson() {
        return { title: this.title, form: this.form, id: this.id };
    }

    getFlowTask(flow: string|Flow) {
        const allTasksInBoard: Array<any> = [];
        this.columns.forEach((column, index) => column.tasks.forEach(task => allTasksInBoard.push(task)));
        const flowId = flow.toString();
        const task = allTasksInBoard.find(t => t.flowId === flowId);
        if (task) {
            return Object.assign(new FlowTask(''), task);
        } else {
            return task;
        }
    }
}

export class Flow {
    constructor(public id: string) {}

    toString() {
        return this.id;
    }
}

export class FlowTask {
    constructor(public id: string) {}

    toString() {
        return this.id;
    }
}
