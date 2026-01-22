import { addType } from "../../../util/json";
import CaseEngineEvent from "../caseengineevent";
import EventMetadata from "./eventmetadata";

export default class ModelEvent {
    public engineEvent!: CaseEngineEvent;
    private modelEvent: EventMetadata = EventMetadata.EMPTY; // It is called 'modelEvent' in the JSON payload, and it holds metadata

    init_json() {
        if (this.modelEvent) {
            addType(this.modelEvent, EventMetadata);
        }
        else {
            console.log("Payload.metadata is missing");
        }
    }

    get offset(): number {
        return this.engineEvent.offset;
    }
    
    get metadata(): EventMetadata {
        return this.modelEvent;
    }

    toString(): string {
        return this.constructor.name;
        // return JSON.stringify(this, undefined, 2);
    }

    hasType(type: Function): boolean {
        return this instanceof type;
    }
}
