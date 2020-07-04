import CaseTeamMember from "./caseteammember";
import User from "../user";

/**
 * Simple CaseTeam wrapper class.
 * Each case instance has it's own team.
 */
export default class CaseTeam {
    public caseRoles? : String[] = undefined
    public unassignedRoles?: String[] = undefined

    constructor(public members: CaseTeamMember[]) {}

    find(user: User) {
        return this.members.find(member => member.memberId === user.id);
    }
}