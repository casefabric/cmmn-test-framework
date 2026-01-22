import CaseEvent from "./caseevent";

export default class CaseModified extends CaseEvent {
    public source: string = '';

    toString(): string {
        return `${this.constructor.name}[source = ${this.source}]\n`;
    }
}
