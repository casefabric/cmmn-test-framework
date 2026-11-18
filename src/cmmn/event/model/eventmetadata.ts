import Path from "../../../service/case/path";
import User from "../../../user";
import { addType } from "../../../util/json";
import ActorMetadata from "./actormetadata";

export default class EventMetadata {
    static EMPTY: EventMetadata = new EventMetadata();
    public user: User = User.NONE;
    public actor: ActorMetadata = ActorMetadata.EMPTY;
    public actorId: string = '';
    public correlationId: string = '';
    public tenant: string = '';
    public timestamp: string = '';

    init_json() {
        addType(this.user, User);
        const actor = this.actor ? String(this.actor) : String(this.actorId);
        this.actor = ActorMetadata.parsePath(actor);
    }
}
