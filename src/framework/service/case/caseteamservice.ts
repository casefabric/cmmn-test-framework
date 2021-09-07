import User from "../../user";
import Case from "../../cmmn/case";
import CaseTeam from "../../cmmn/caseteam";
import CaseTeamMember from "../../cmmn/caseteammember";
import CafienneService from "../cafienneservice";
import { checkResponse, checkJSONResponse } from "../response";

const cafienneService = new CafienneService();

export default class CaseTeamService {
    /**
     * Get the CaseTeam of the specified case instance
     * @param caseInstance 
     * @param user 
     * @returns CaseTeam
     */
    async getCaseTeam(user: User, caseId: Case | string, expectedStatusCode: number = 200): Promise<CaseTeam> {
        const response = await cafienneService.get(`/cases/${caseId}/caseteam`, user);
        const msg = `GetCaseTeam is not expected to succeed for user ${user.id} in case ${caseId}`;
        const caseTeam = await checkJSONResponse(response, msg, expectedStatusCode, CaseTeam);
        return caseTeam;
    }

    /**
     * Assign the specified team to the case
     * @param Case
     * @param user 
     * @param team 
     */
    async setCaseTeam(user: User, caseId: Case | string, team: CaseTeam, expectedStatusCode: number = 200) {
        const response = await cafienneService.post(`/cases/${caseId}/caseteam`, user, team);
        const msg = `SetCaseTeam is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Delete the specified member from the case team.
     * @param Case 
     * @param user 
     * @param member 
     */
    async removeMember(user: User, caseId: Case | string, member: User|CaseTeamMember, expectedStatusCode: number = 200) {
        const memberType = member instanceof User ? 'user' : member.memberType;
        const memberId = member instanceof User ? member.id : member.memberId; 
        const response = await cafienneService.delete(`/cases/${caseId}/caseteam/${memberId}?type=${memberType}`, user);
        const msg = `RemoveTeamMember is not expected to succeed for member ${memberId} of type ${memberType} in case ${caseId}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Add or update a case team member.
     * @param Case 
     * @param user 
     * @param member 
     */
    async setMember(user: User, caseId: Case | string, member: CaseTeamMember, expectedStatusCode: number = 200) {
        const response = await cafienneService.put(`/cases/${caseId}/caseteam`, user, member);
        const msg = `SetTeamMember is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Remove a role from a case team member.
     * @param Case 
     * @param user 
     * @param member 
     */
    async removeMemberRoles(user: User, caseId: Case | string, member: CaseTeamMember, roles: string|string[], expectedStatusCode: number = 200) {
        const memberWithoutRoles = Object.assign({}, member);
        memberWithoutRoles.removeRoles = roles instanceof Array ? roles : [roles];
        const response = await cafienneService.put(`/cases/${caseId}/caseteam`, user, memberWithoutRoles);
        const msg = `RemoveTeamMemberRole is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkResponse(response, msg, expectedStatusCode);
    }
}