import Case from "../../cmmn/case";
import CaseTeam from "../../cmmn/team/caseteam";
import CaseTeamGroup from "../../cmmn/team/caseteamgroup";
import CaseTeamTenantRole from "../../cmmn/team/caseteamtenantrole";
import CaseTeamUser from "../../cmmn/team/caseteamuser";
import User from "../../user";
import Trace from "../../util/async/trace";
import CaseEngineService from "../caseengineservice";

export default class CaseTeamService {
    /**
     * Get the CaseTeam of the specified case instance
     * @param caseInstance 
     * @param user 
     * @returns CaseTeam
     */
    static async getCaseTeam(user: User, caseId: Case | string, expectedStatusCode: number = 200, msg = `GetCaseTeam is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()): Promise<CaseTeam> {
        const response = await CaseEngineService.get(`/cases/${caseId}/caseteam`, user);
        const caseTeam = await response.validateObject(CaseTeam, msg, expectedStatusCode, trace);
        return caseTeam;
    }

    /**
     * Assign the specified team to the case
     * @param Case
     * @param user 
     * @param team 
     */
    static async setCaseTeam(user: User, caseId: Case | string, team: CaseTeam, expectedStatusCode: number = 200, msg = `SetCaseTeam is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()) {
        const response = await CaseEngineService.post(`/cases/${caseId}/caseteam`, user, team);
        return response.validate(msg, expectedStatusCode, trace);
    }

    /**
     * Add or update a case team member.
     * @param Case 
     * @param user 
     * @param caseTeamUser 
     */
    static async setUser(user: User, caseId: Case | string, caseTeamUser: CaseTeamUser, expectedStatusCode: number = 200, msg = `SetCaseTeamUser(${caseTeamUser}) is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()) {
        const response = await CaseEngineService.post(`/cases/${caseId}/caseteam/users`, user, caseTeamUser);
        return response.validate(msg, expectedStatusCode, trace);
    }

    /**
     * Delete the specified member from the case team.
     * @param Case 
     * @param user 
     * @param member 
     */
    static async removeUser(user: User, caseId: Case | string, userId: User | CaseTeamUser | string, expectedStatusCode: number = 200, msg = `RemoveCaseTeamUser(${userId}) is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()) {
        const response = await CaseEngineService.delete(`/cases/${caseId}/caseteam/users/${userId}`, user);
        return response.validate(msg, expectedStatusCode, trace);
    }

    /**
     * Add or update a case team member.
     * @param Case 
     * @param user 
     * @param group 
     */
     static async setGroup(user: User, caseId: Case | string, group: CaseTeamGroup, expectedStatusCode: number = 200, msg = `SetCaseTeamGroup(${group}) is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()) {
        const response = await CaseEngineService.post(`/cases/${caseId}/caseteam/groups`, user, group);
        return response.validate(msg, expectedStatusCode, trace);
    }

    /**
     * Delete the specified member from the case team.
     * @param Case 
     * @param user 
     * @param group 
     */
    static async removeGroup(user: User, caseId: Case | string, groupId: CaseTeamGroup | string, expectedStatusCode: number = 200, msg = `RemoveCaseTeamGroup(${groupId}) is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()) {
        const response = await CaseEngineService.delete(`/cases/${caseId}/caseteam/groups/${groupId}`, user);
        return response.validate(msg, expectedStatusCode, trace);
    }

    /**
     * Add or update a case team member.
     * @param Case 
     * @param user 
     * @param tenantRole 
     */
     static async setTenantRole(user: User, caseId: Case | string, tenantRole: CaseTeamTenantRole, expectedStatusCode: number = 200, msg = `SetCaseTeamTenantRole(${tenantRole}) is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()) {
        const response = await CaseEngineService.post(`/cases/${caseId}/caseteam/tenant-roles`, user, tenantRole);
        return response.validate(msg, expectedStatusCode, trace);
    }

    /**
     * Delete the specified member from the case team.
     * @param Case 
     * @param user 
     * @param tenantRole 
     */
    static async removeTenantRole(user: User, caseId: Case | string, tenantRoleName: CaseTeamTenantRole | string, expectedStatusCode: number = 200, msg = `RemoveCaseTeamTenantRole(${tenantRoleName}) is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()) {
        const response = await CaseEngineService.delete(`/cases/${caseId}/caseteam/tenant-roles/${tenantRoleName}`, user);
        return response.validate(msg, expectedStatusCode, trace);
    }
}
