import CaseEvent from "../caseevent";
import Path from "../../../../../service/case/path";

export default class CasePlanEvent extends CaseEvent {
    public planItemId: string = '';
    public stageId: string = '';
    public path: Path = Path.EMPTY;
    public type: string = '';
    public index: number = -1;

    init_json() {
        super.init_json();
        this.path = Path.from(this.path); // Note: this will parse both types "Path" and "string"
    }

    get name() {
        return this.path.name;
    }

    toString(): string {
        return `${this.type}[${this.path}]`;
    }
}