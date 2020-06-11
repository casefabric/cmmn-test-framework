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
    async getCaseTeam(Case: Case, user: User, expectNoFailures: boolean = true): Promise<CaseTeam> {
        const response = await cafienneService.get(`/cases/${Case.id}/caseteam`, user);
        const msg = `GetCaseTeam is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkJSONResponse(response, msg, expectNoFailures, CaseTeam);
    }

    /**
     * Assign the specified team to the case
     * @param Case
     * @param user 
     * @param team 
     */
    async setCaseTeam(Case: Case, user: User, team: CaseTeam, expectNoFailures: boolean = true) {
        const response = await cafienneService.post(`/cases/${Case.id}/caseteam`, user, team);
        const msg = `SetCaseTeam is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectNoFailures);
    }

    /**
     * Delete the specified member from the case team.
     * @param Case 
     * @param user 
     * @param member 
     */
    async removeMember(Case: Case, user: User, member: User|CaseTeamMember, expectNoFailures: boolean = true) {
        const memberType = member instanceof User ? 'user' : member.memberType;
        const memberId = member instanceof User ? member.id : member.memberId; 
        const response = await cafienneService.delete(`/cases/${Case.id}/caseteam/${memberId}?type=${memberType}`, user);
        const msg = `RemoveTeamMember is not expected to succeed for member ${memberId} of type ${memberType} in case ${Case.id}`;
        return checkResponse(response, msg, expectNoFailures);
    }

    /**
     * Add or update a case team member.
     * @param Case 
     * @param user 
     * @param member 
     */
    async setMember(Case: Case, user: User, member: CaseTeamMember, expectNoFailures: boolean = true) {
        const response = await cafienneService.put(`/cases/${Case.id}/caseteam`, user, member);
        const msg = `SetTeamMember is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectNoFailures);
    }

    /**
     * Remove a role from a case team member.
     * @param Case 
     * @param user 
     * @param member 
     */
    async removeMemberRoles(Case: Case, user: User, member: CaseTeamMember, roles: string|string[], expectNoFailures: boolean = true) {
        const memberWithoutRoles = Object.assign({}, member);
        memberWithoutRoles.removeRoles = roles instanceof Array ? roles : [roles];
        const response = await cafienneService.put(`/cases/${Case.id}/caseteam`, user, memberWithoutRoles);
        const msg = `RemoveTeamMemberRole is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectNoFailures);
    }
}