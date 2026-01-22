import CasePlanEvent from "../plan/caseplanevent";

export default class CasePlanMigrationEvent extends CasePlanEvent {

    toString(): string {
        return `${this.constructor.name}: ${this.path}`;
    }
}
