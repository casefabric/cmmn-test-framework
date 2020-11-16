import User from "../../user";
import Case from "../../cmmn/case";
import CaseTeam from "../../cmmn/caseteam";
import CaseTeamMember from "../../cmmn/caseteammember";
import CafienneService from "../cafienneservice";
import { checkResponse, checkJSONResponse } from "../response";
import RoleBinding from "../../cmmn/rolebinding";

const cafienneService = new CafienneService();

export default class CaseTeamService {
    /**
     * Get the CaseTeam of the specified case instance
     * @param Case 
     * @param user 
     * @returns CaseTeam
     */
    async getCaseTeam(user: User, Case: Case, expectedStatusCode: number = 200): Promise<CaseTeam> {
        const response = await cafienneService.get(`/cases/${Case.id}/caseteam`, user);
        const msg = `GetCaseTeam is not expected to succeed for user ${user.id} in case ${Case.id}`;
        const caseTeam = await checkJSONResponse(response, msg, expectedStatusCode, CaseTeam);
        return caseTeam;
    }

    /**
     * Assign the specified team to the case
     * @param Case
     * @param user 
     * @param team 
     */
    async setCaseTeam(user: User, Case: Case, team: CaseTeam, expectedStatusCode: number = 200) {
        const response = await cafienneService.post(`/cases/${Case.id}/caseteam`, user, team);
        const msg = `SetCaseTeam is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Delete the specified member from the case team.
     * @param Case 
     * @param user 
     * @param member 
     */
    async removeMember(user: User, Case: Case, member: User|CaseTeamMember, expectedStatusCode: number = 200) {
        const memberType = member instanceof User ? 'user' : member.memberType;
        const memberId = member instanceof User ? member.id : member.memberId; 
        const response = await cafienneService.delete(`/cases/${Case.id}/caseteam/${memberId}?type=${memberType}`, user);
        const msg = `RemoveTeamMember is not expected to succeed for member ${memberId} of type ${memberType} in case ${Case.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Add or update a case team member.
     * @param Case 
     * @param user 
     * @param member 
     */
    async setMember(user: User, Case: Case, member: CaseTeamMember, expectedStatusCode: number = 200) {
        const response = await cafienneService.put(`/cases/${Case.id}/caseteam`, user, member);
        const msg = `SetTeamMember is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Remove a role from a case team member.
     * @param Case 
     * @param user 
     * @param member 
     */
    async removeMemberRoles(user: User, Case: Case, member: CaseTeamMember, roles: string|string[], expectedStatusCode: number = 200) {
        const memberWithoutRoles = Object.assign({}, member);
        memberWithoutRoles.removeRoles = roles instanceof Array ? roles : [roles];
        const response = await cafienneService.put(`/cases/${Case.id}/caseteam`, user, memberWithoutRoles);
        const msg = `RemoveTeamMemberRole is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }
}