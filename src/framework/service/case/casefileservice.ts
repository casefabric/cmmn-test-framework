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
    async getCaseFile(user: User, Case: Case, expectedStatusCode: number = 200) {
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
    async createCaseFileItem(user: User, Case: Case, path: string, data: object, expectedStatusCode: number = 200) {
        const response = await cafienneService.post(`/cases/${Case.id}/casefile/create/${encodeURI(path)}`, user, data);
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
    async updateCaseFileItem(user: User, Case: Case, path: string, data: any, expectedStatusCode: number = 200) {
        const response = await cafienneService.put(`/cases/${Case.id}/casefile/update/${encodeURI(path)}`, user, data);
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
    async replaceCaseFileItem(user: User, Case: Case, path: string, data: object, expectedStatusCode: number = 200) {
        const response = await cafienneService.put(`/cases/${Case.id}/casefile/replace/${encodeURI(path)}`, user, data);
        const msg = `ReplaceCaseFileItem is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Delete a case file item
     * @param Case 
     * @param user 
     * @param path 
     */
    async deleteCaseFileItem(user: User, Case: Case, path: string, expectedStatusCode: number = 200) {
        const response = await cafienneService.delete(`/cases/${Case.id}/casefile/delete/${encodeURI(path)}`, user);
        const msg = `DeleteCaseFileItem is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Create case file contents
     * @param Case 
     * @param user 
     * @param path 
     * @param data Any json structure matching the case file definition
     */
    async createCaseFile(user: User, Case: Case, data: object, expectedStatusCode: number = 200) {
        const response = await cafienneService.post(`/cases/${Case.id}/casefile/create/`, user, data);
        const msg = `CreateCaseFile is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Update case file contents
     * @param Case
     * @param user 
     * @param path 
     * @param data 
     */
    async updateCaseFile(user: User, Case: Case, data: any, expectedStatusCode: number = 200) {
        const response = await cafienneService.put(`/cases/${Case.id}/casefile/update/`, user, data);
        const msg = `UpdateCaseFile is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Replace case file
     * @param Case 
     * @param user 
     * @param path 
     * @param data 
     */
    async replaceCaseFile(user: User, Case: Case, data: object, expectedStatusCode: number = 200) {
        const response = await cafienneService.put(`/cases/${Case.id}/casefile/replace/`, user, data);
        const msg = `ReplaceCaseFile is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Delete entire case file 
     * @param Case 
     * @param user 
     * @param path 
     */
    async deleteCaseFile(user: User, Case: Case, expectedStatusCode: number = 200) {
        const response = await cafienneService.delete(`/cases/${Case.id}/casefile/delete/`, user);
        const msg = `DeleteCaseFile is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }
}
