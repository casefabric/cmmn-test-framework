import User from "../../user";
import Case from "../../cmmn/case";
import CafienneService from "../cafienneservice";
import { checkJSONResponse, checkResponse } from "../response";
import CaseFileItemDocumentation from "../../cmmn/casefileitemdocumentation";

export default class CaseFileService {
    /**
     * Get the CaseFile of the specified case instance
     * @param Case 
     * @param user 
     */
    static async getCaseFile(user: User, caseId: Case | string, expectedStatusCode: number = 200, msg = `GetCaseFile is not expected to succeed for user ${user} in case ${caseId}`) {
        const response = await CafienneService.get(`/cases/${caseId}/casefile`, user);
        return checkJSONResponse(response, msg, expectedStatusCode);
    }

    /**
     * Get the plan item's documentation
     * @param Case 
     * @param user 
     * @param planItemId
     */
    static async getCaseFileDocumentation(user: User, caseId: Case | string, expectedStatusCode: number = 200, msg = `GetPlanItem is not expected to succeed for user ${user} in case ${caseId}`): Promise<Array<CaseFileItemDocumentation>> {
        const response = await CafienneService.get(`/cases/${caseId}/documentation/casefile`, user);
        return checkJSONResponse(response, msg, expectedStatusCode, [CaseFileItemDocumentation]);
    }

    /**
     * Create case file item contents in the specified path
     * @param Case 
     * @param user 
     * @param path 
     * @param data Any json structure matching the case file definition
     */
    static async createCaseFileItem(user: User, caseId: Case | string, path: string, data: object, expectedStatusCode: number = 200, msg = `CreateCaseFileItem is not expected to succeed for user ${user} in case ${caseId}`) {
        const response = await CafienneService.post(`/cases/${caseId}/casefile/create/${encodeURI(path)}`, user, data);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Update case file item contents
     * @param Case
     * @param user 
     * @param path 
     * @param data 
     */
    static async updateCaseFileItem(user: User, caseId: Case | string, path: string, data: any, expectedStatusCode: number = 200, msg = `UpdateCaseFileItem is not expected to succeed for user ${user} in case ${caseId}`) {
        const response = await CafienneService.put(`/cases/${caseId}/casefile/update/${encodeURI(path)}`, user, data);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Replace case file item contents
     * @param Case 
     * @param user 
     * @param path 
     * @param data 
     */
    static async replaceCaseFileItem(user: User, caseId: Case | string, path: string, data: object, expectedStatusCode: number = 200, msg = `ReplaceCaseFileItem is not expected to succeed for user ${user} in case ${caseId}`) {
        const response = await CafienneService.put(`/cases/${caseId}/casefile/replace/${encodeURI(path)}`, user, data);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Delete a case file item
     * @param Case 
     * @param user 
     * @param path 
     */
    static async deleteCaseFileItem(user: User, caseId: Case | string, path: string, expectedStatusCode: number = 200, msg = `DeleteCaseFileItem is not expected to succeed for user ${user} in case ${caseId}`) {
        const response = await CafienneService.delete(`/cases/${caseId}/casefile/delete/${encodeURI(path)}`, user);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Create case file contents
     * @param Case 
     * @param user 
     * @param path 
     * @param data Any json structure matching the case file definition
     */
    static async createCaseFile(user: User, caseId: Case | string, data: object, expectedStatusCode: number = 200, msg = `CreateCaseFile is not expected to succeed for user ${user} in case ${caseId}`) {
        const response = await CafienneService.post(`/cases/${caseId}/casefile/create/`, user, data);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Update case file contents
     * @param Case
     * @param user 
     * @param path 
     * @param data 
     */
    static async updateCaseFile(user: User, caseId: Case | string, data: any, expectedStatusCode: number = 200, msg = `UpdateCaseFile is not expected to succeed for user ${user} in case ${caseId}`) {
        const response = await CafienneService.put(`/cases/${caseId}/casefile/update/`, user, data);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Replace case file
     * @param Case 
     * @param user 
     * @param path 
     * @param data 
     */
    static async replaceCaseFile(user: User, caseId: Case | string, data: object, expectedStatusCode: number = 200, msg = `ReplaceCaseFile is not expected to succeed for user ${user} in case ${caseId}`) {
        const response = await CafienneService.put(`/cases/${caseId}/casefile/replace/`, user, data);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Delete entire case file 
     * @param Case 
     * @param user 
     * @param path 
     */
    static async deleteCaseFile(user: User, caseId: Case | string, expectedStatusCode: number = 200, msg = `DeleteCaseFile is not expected to succeed for user ${user} in case ${caseId}`) {
        const response = await CafienneService.delete(`/cases/${caseId}/casefile/delete/`, user);
        return checkResponse(response, msg, expectedStatusCode);
    }
}
