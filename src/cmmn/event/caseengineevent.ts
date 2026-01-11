export default class CaseEngineEvent {
    constructor(public type: string, public offset: number, public content: any) { }

    toString() {
        if (this.type && this.type.indexOf('Migrated') >= 0 || this.type.indexOf('Dropped') >= 0 || this.type.indexOf('Created') >= 0) {
            if (this.type.indexOf('PlanItem') >= 0 || this.type.indexOf('HumanTask') >= 0) {
                return `${this.type}: ${this.content.path}`;
            } else if (this.type.indexOf('CaseDefinitionMigrated') >= 0) {
                return `${this.type} to ${this.content.caseName}`;
            }
        } else if (this.type.indexOf('Transitioned') >= 0) {
            return `${this.type} - ${this.content.type}[${this.path}]: ${this.content.historyState} ==> ${this.content.transition.toLowerCase()} ==> ${this.content.currentState}`;
        } else if (this.type.indexOf('Modified') >= 0) {
            return this.type +"\n";
        } else {
            return this.type;
        }

    }

    hasType(type: string): boolean {
        return this.type === type;
    }

    get name(): string {
        return this.path.split('/').reverse()[0];
    }

    get path(): string {
        return this.content.path;
    }
}
