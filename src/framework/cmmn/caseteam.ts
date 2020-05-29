import CaseTeamMember from "./caseteammember";
import User from "../user";
import RoleBinding from "./rolebinding";

/**
 * Simple CaseTeam wrapper class.
 * Each case instance has it's own team.
 */
export default class CaseTeam {
    constructor(public members: CaseTeamMember[]) {}

    find(user: User) {
        return this.members.find(member => member.user === user.id);
    }
}