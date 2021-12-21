import Case from "../../cmmn/case";
import CaseTeam from "../../cmmn/team/caseteam";
import CaseTeamGroup from "../../cmmn/team/caseteamgroup";
import CaseTeamUser from "../../cmmn/team/caseteamuser";
import CaseTeamTenantRole from "../../cmmn/team/caseteamtenantrole";
import User from "../../user";
import CafienneService from "../cafienneservice";
import { checkJSONResponse, checkResponse } from "../response";

export default class CaseTeamService {
    /**
     * Get the CaseTeam of the specified case instance
     * @param caseInstance 
     * @param user 
     * @returns CaseTeam
     */
    static async getCaseTeam(user: User, caseId: Case | string, expectedStatusCode: number = 200, msg = `GetCaseTeam is not expected to succeed for user ${user} in case ${caseId}`): Promise<CaseTeam> {
        const response = await CafienneService.get(`/cases/${caseId}/caseteam`, user);
        const caseTeam = await checkJSONResponse(response, msg, expectedStatusCode, CaseTeam);
        return caseTeam;
    }

    /**
     * Assign the specified team to the case
     * @param Case
     * @param user 
     * @param team 
     */
    static async setCaseTeam(user: User, caseId: Case | string, team: CaseTeam, expectedStatusCode: number = 200, msg = `SetCaseTeam is not expected to succeed for user ${user} in case ${caseId}`) {
        const response = await CafienneService.post(`/cases/${caseId}/caseteam`, user, team);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Add or update a case team member.
     * @param Case 
     * @param user 
     * @param caseTeamUser 
     */
    static async setUser(user: User, caseId: Case | string, caseTeamUser: CaseTeamUser, expectedStatusCode: number = 200, msg = `SetCaseTeamUser(${caseTeamUser}) is not expected to succeed for user ${user} in case ${caseId}`) {
        const response = await CafienneService.post(`/cases/${caseId}/caseteam/users`, user, caseTeamUser);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Delete the specified member from the case team.
     * @param Case 
     * @param user 
     * @param member 
     */
    static async removeUser(user: User, caseId: Case | string, userId: User | CaseTeamUser | string, expectedStatusCode: number = 200, msg = `RemoveCaseTeamUser(${userId}) is not expected to succeed for user ${user} in case ${caseId}`) {
        const response = await CafienneService.delete(`/cases/${caseId}/caseteam/users/${userId}`, user);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Add or update a case team member.
     * @param Case 
     * @param user 
     * @param group 
     */
     static async setGroup(user: User, caseId: Case | string, group: CaseTeamGroup, expectedStatusCode: number = 200, msg = `SetCaseTeamGroup(${group}) is not expected to succeed for user ${user} in case ${caseId}`) {
        const response = await CafienneService.post(`/cases/${caseId}/caseteam/groups`, user, group);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Delete the specified member from the case team.
     * @param Case 
     * @param user 
     * @param group 
     */
    static async removeGroup(user: User, caseId: Case | string, groupId: CaseTeamGroup | string, expectedStatusCode: number = 200, msg = `RemoveCaseTeamGroup(${groupId}) is not expected to succeed for user ${user} in case ${caseId}`) {
        const response = await CafienneService.delete(`/cases/${caseId}/caseteam/groups/${groupId}`, user);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Add or update a case team member.
     * @param Case 
     * @param user 
     * @param tenantRole 
     */
     static async setTenantRole(user: User, caseId: Case | string, tenantRole: CaseTeamTenantRole, expectedStatusCode: number = 200, msg = `SetCaseTeamTenantRole(${tenantRole}) is not expected to succeed for user ${user} in case ${caseId}`) {
        const response = await CafienneService.post(`/cases/${caseId}/caseteam/tenant-roles`, user, tenantRole);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Delete the specified member from the case team.
     * @param Case 
     * @param user 
     * @param tenantRole 
     */
    static async removeTenantRole(user: User, caseId: Case | string, tenantRoleName: CaseTeamTenantRole | string, expectedStatusCode: number = 200, msg = `RemoveCaseTeamTenantRole(${tenantRoleName}) is not expected to succeed for user ${user} in case ${caseId}`) {
        const response = await CafienneService.delete(`/cases/${caseId}/caseteam/tenant-roles/${tenantRoleName}`, user);
        return checkResponse(response, msg, expectedStatusCode);
    }
}