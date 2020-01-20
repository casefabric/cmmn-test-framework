import User from "../../user";
import Case from "../../cmmn/case";
import CaseTeam from "../../cmmn/caseteam";
import CaseTeamMember from "../../cmmn/caseteammember";

export default class CaseTeamService {
    /**
     * Get the CaseTeam of the specified case instance
     * @param Case 
     * @param user 
     */
    async getCaseTeam(Case: Case, user: User) {
        throw new Error('Not yet implemented')
    }

    /**
     * Assign the specified team to the case
     * @param Case
     * @param user 
     * @param team 
     */
    async setCaseTeam(Case: Case, user: User, team: CaseTeam) {
        throw new Error('Not yet implemented')
    }

    /**
     * Delete the specified member from the case team.
     * @param Case 
     * @param user 
     * @param member 
     */
    async deleteMember(Case: Case, user: User, member: User) {
        throw new Error('Not yet implemented')
    }

    /**
     * Add or update a case team member.
     * @param Case 
     * @param user 
     * @param member 
     */
    async setMember(Case: Case, user: User, member: CaseTeamMember) {
        throw new Error('Not yet implemented')
    }
}