import CasePlanEvent from "./caseplanevent";

export default class PlanItemTransitioned extends CasePlanEvent {
    public historyState: string = '';
    public transition: string = '';
    public currentState: string = '';

    toString(): string {
        return `${this.type}[${this.path}]: ${this.historyState} ==> ${this.transition.toLowerCase()} ==> ${this.currentState}`;
    }
}
