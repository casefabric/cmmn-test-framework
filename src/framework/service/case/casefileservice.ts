import User from "../../user";
import Case from "../../cmmn/case";
import CafienneService from "../cafienneservice";
import { checkJSONResponse, checkResponse } from "../response";

const cafienneService = new CafienneService();

export default class CaseFileService {
    /**
     * Get the CaseFile of the specified case instance
     * @param Case 
     * @param user 
     */
    async getCaseFile(Case: Case, user: User, expectedStatusCode: number = 200) {
        const response = await cafienneService.get(`/cases/${Case.id}/casefile`, user);
        const msg = `GetCaseFile is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkJSONResponse(response, msg, expectedStatusCode);
    }

    /**
     * Create case file item contents in the specified path
     * @param Case 
     * @param user 
     * @param path 
     * @param data Any json structure matching the case file definition
     */
    async createCaseFileItem(Case: Case, user: User, path: string, data: object, expectedStatusCode: number = 200) {
        const response = await cafienneService.post(`/cases/${Case.id}/casefile/create/${path}`, user, data);
        const msg = `CreateCaseFileItem is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Update case file item contents
     * @param Case
     * @param user 
     * @param path 
     * @param data 
     */
    async updateCaseFileItem(Case: Case, user: User, path: string, data: any, expectedStatusCode: number = 200) {
        const response = await cafienneService.put(`/cases/${Case.id}/casefile/update/${path}`, user, data);
        const msg = `UpdateCaseFileItem is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Replace case file item contents
     * @param Case 
     * @param user 
     * @param path 
     * @param data 
     */
    async replaceCaseFileItem(Case: Case, user: User, path: string, data: object, expectedStatusCode: number = 200) {
        const response = await cafienneService.put(`/cases/${Case.id}/casefile/replace/${path}`, user, data);
        const msg = `ReplaceCaseFileItem is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Delete a case file item
     * @param Case 
     * @param user 
     * @param path 
     */
    async deleteCaseFileItem(Case: Case, user: User, path: string, expectedStatusCode: number = 200) {
        const response = await cafienneService.delete(`/cases/${Case.id}/casefile/delete/${path}`, user);
        const msg = `DeleteCaseFileItem is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }
}