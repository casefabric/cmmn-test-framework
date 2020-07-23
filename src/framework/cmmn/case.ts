import PlanItem from './planitem';
import CaseTeam from './caseteam';
import CaseFile from './casefile';
import CaseTeamMember from './caseteammember';

/**
 * Wrapper for json response of Cafienne Service for a single case instance.
 */
export default interface Case {
    id: string;
    tenant: string;
    caseName: string;
    state: string;
    failures: number;
    parentCaseId: string;
    rootCaseId: string;
    createdOn: Date;
    createdBy: string;
    lastModified: string;
    modifiedBy: string;

    // Apparently input and output parameters of a case are not stored yet?!
    // inputs: object;
    // outputs: object;

    team: Array<CaseTeamMember>;
    planitems: Array<PlanItem>;
    file: CaseFile;
}
