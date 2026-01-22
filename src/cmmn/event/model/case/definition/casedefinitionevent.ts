import CaseEvent from "../caseevent";

export default class CaseDefinitionEvent extends CaseEvent {
    public caseName: string = '';

    toString(): string {
        return `${this.constructor.name}: to ${this.caseName}`;
    }
}
