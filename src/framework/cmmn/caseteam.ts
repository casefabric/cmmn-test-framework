import CaseTeamMember from "./caseteammember";
import User from "../user";
import CMMNBaseClass from "./cmmnbaseclass";
import CaseTeamGroup from "./caseteamgroup";

/**
 * Simple CaseTeam wrapper class.
 * Each case instance has it's own team.
 */
export default class CaseTeam extends CMMNBaseClass {
    public caseRoles?: String[] = undefined
    public unassignedRoles?: String[] = undefined

    /**
     * 
     * @param members Members in this team
     * @param groups Consent Groups in this team
     */
    constructor(public members: CaseTeamMember[], public groups?: Array<CaseTeamGroup>) { super(); }

    find(user: User) {
        return this.members.find(member => member.memberId === user.id);
    }
}