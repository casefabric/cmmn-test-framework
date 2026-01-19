import CaseEvent from "../caseevent";
import Path from "../../../../../service/case/path";

export default class CaseFileEvent extends CaseEvent {
    public path: Path = Path.EMPTY;
    public type: string = '';
    public state: string = '';
}
