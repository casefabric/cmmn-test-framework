import Path from "../../../service/case/path";
import User from "../../../user";
import { addType } from "../../../util/json";

export default class EventMetadata {
    static EMPTY: EventMetadata = new EventMetadata();
    public user: User = User.NONE;
    
    public actor: string = '';
    public actorId: string = '';
    public correlationId: string = '';
    public tenant: string = '';
    public timestamp: string = '';

    init_json() {
        addType(this.user, User);
        if (this.actor) {
            const path = Path.from(this.actor);
            this.actor = String(this.actor);
        }
    }
}

export class ActorMetadata {
    public id: string = '';
    public type: string = '';
    public parent?: ActorMetadata;
}
