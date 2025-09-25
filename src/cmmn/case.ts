import PlanItem from './planitem';
import CaseTeam from './team/caseteam';
import CaseFile from './casefile';
import CaseTeamUser from "./team/caseteamuser";
import CMMNBaseClass from './cmmnbaseclass';
import Path from '../service/case/path';

/**
 * Wrapper for json response of Cafienne Service for a single case instance.
 */
export default class Case extends CMMNBaseClass {
    /**
     * 
     * @param id ID of the case
     * @param tenant Tenant in which the case resides
     * @param caseName Name of the case (taken from the definition)
     * @param state State of the case (taken from case plan)
     * @param failures Number of failures (plan items in state Failed) in this case
     * @param parentCaseId Id of parent case; is null or empty if there is no parent case
     * @param rootCaseId Id of the top most ancestor case. Is equal to the case id if there is no parent case
     * @param createdOn Timestamp of case creation
     * @param createdBy Id of user that created the case
     * @param lastModified Timestamp of last modification to the case 
     * @param modifiedBy Id of user that last modified the case
     * @param team Array of members that form the case team
     * @param planitems List of all planitems created (or planned) inside the case
     * @param file JSON structor of the case file
     */
    constructor(
        public id: string,
        public tenant: string,
        public caseName: string,
        public state: string,
        public failures: number,
        public parentCaseId: string,
        public rootCaseId: string,
        public createdOn: Date,
        public createdBy: string,
        public lastModified: string,
        public modifiedBy: string,

        // Apparently input and output parameters of a case are not stored yet?!
        // public inputs: object,
        // public outputs: object,

        public team: CaseTeam,
        public planitems: Array<PlanItem>,
        public file: CaseFile
    ) { super(); }

    get plan(): PlanItem {
        const caseplan = this.planitems.find(item => item.type === 'CasePlan');
        if (!caseplan) {
            throw new Error(`Could not find case plan among the ${this.planitems.length} items in the case`);
        }
        return caseplan;
    }

    toString() {
        return this.id;
    }

    toConsole() {
        console.log(`Case ${this.caseName} [id = ${this.id} | parent = ${this.parentCaseId} | root = ${this.rootCaseId} | createdBy = ${this.createdBy} | modifiedBy = ${this.modifiedBy}]\n${this.printPlan()}`);
        return this;
    }

    /**
     * Returns the plan item matching the path, or throws an error
     * @param path - The path to resolve on the plan item structure of the case
     */
    findItem(path: Path | string): PlanItem {
        const item = Path.from(path).resolve(this);
        if (! item) {
            throw new Error(`Expected a plan item ${path} to be present in the case, but it cannot be found`);
        }
        return item;
    }

    printPlan(): string {
        class Wrapper {
            stage?: Wrapper;
            children: Array<Wrapper> = [];
            constructor(public item: PlanItem) { }
            print(indent = ''): string {
                const item = this.item;
                const string = `${indent}- ${item.type}[${item.name}.${item.index}] | state = ${item.currentState} | transition = ${item.transition} | id = ${item.id}\n`;
                return string + this.children.map(child => child.print(indent + ' ')).join('');
            }
        }
        const stages = this.planitems.filter(item => item.type === 'Stage' || item.type === 'CasePlan').map(item => new Wrapper(item));
        const wrappers = this.planitems.filter(item => item.type !== 'Stage' && item.type !== 'CasePlan').map(item => {
            const wrapper = new Wrapper(item);
            if (item.stageId) {
                wrapper.stage = stages.find(stage => stage.item.id === item.stageId);
                wrapper.stage?.children.push(wrapper);
            }
            return wrapper;
        });
        stages.forEach(wrapper => {
            if (wrapper.item.type === 'Stage') {
                wrapper.stage = stages.find(stage => stage.item.id === wrapper.item.stageId);
                wrapper.stage?.children.push(wrapper);
            }
        });
        const cp = stages.find(wrapper => wrapper.item.type === 'CasePlan');
        if (cp) {
            return cp.print();
        } else {
            return 'Cannot print the plan items of the case as it does not contain a case plan';
        }
    }
}
