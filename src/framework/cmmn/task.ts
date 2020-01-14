import PlanItem from "./planitem";
import User from "../user";

export default class Task {
    name: string = '';
    id: string = '';
    type: string = '';

    constructor(planItem: PlanItem) {
        this.name = planItem.name;
        this.id = planItem.id;
        this.type = planItem.type;
    }

    toString() {
        return "Type: " + this.type + ", ID: " + this.id + ", name: " + this.name;
    }

    getURL() {
        return '/tasks/' + this.id;
    }

    fillFromJson(json: any) {
        throw new Error("Method not implemented.");
    }
}
