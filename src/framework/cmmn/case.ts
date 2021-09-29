import PlanItem from './planitem';
import CaseTeam from './caseteam';
import CaseFile from './casefile';
import CaseTeamMember from './caseteammember';
import CMMNBaseClass from './cmmnbaseclass';

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

    toString() {
        return this.id;
    }
}
