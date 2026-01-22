import EventMetadata from "./model/eventmetadata";
import ModelEvent from "./model/modelevent";
import ModelEventFactory from "./model/modeleventfactory";

export default class CaseEngineEvent {
    constructor(public type: string, public offset: number, public content: ModelEvent) { }

    toString() {
        return `${this.type}[offset = ${this.offset}]: ${this.content.toString()}`;
    }

    get metadata(): EventMetadata {
        return this.content.metadata;
    }

    init_json() {
        if (this.content) {
            ModelEventFactory.parse(this);
        } else {
            console.error('CaseEngineEvent.content is missing?!');
        }
    }
}
