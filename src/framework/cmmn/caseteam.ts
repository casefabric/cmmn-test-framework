import CaseTeamMember from "./caseteammember";
import User from "../user";
import CMMNBaseClass from "./cmmnbaseclass";

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
     */
    constructor(public members: CaseTeamMember[]) { super(); }

    find(user: User) {
        return this.members.find(member => member.memberId === user.id);
    }
}