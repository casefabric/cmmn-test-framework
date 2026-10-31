import CasePlanEvent from "./caseplanevent";
import { addTypes } from "../../../../../util/json";

export default class PlanItemChanged extends CasePlanEvent {
    public isRequired: boolean = false;
    public isRepeating: boolean = false;
    public transition: StandardEvent[] = [];

    init_json() {
        super.init_json();
        addTypes(this.transition, StandardEvent);
    }

    toString(): string {
        return `${this.constructor.name}[${this.type}/${this.path}]: required = ${this.isRequired} repeating = ${this.isRepeating};\n    transitions:${this.transition.map((t, i) => '\n      ' + i + ': ' + t.toString()).join('')}`;
    }
}

export class StandardEvent {
    public historyState: string = '';
    public transition: string = '';
    public currentState: string = '';

    toString(): string {
        return `${this.historyState} ==> ${this.transition.toLowerCase()} ==> ${this.currentState}`;
    }
}
