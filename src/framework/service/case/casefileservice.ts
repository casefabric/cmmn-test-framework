import User from "../../user";
import Case from "../../cmmn/case";
import CafienneService from "../cafienneservice";
import { checkJSONResponse } from "../response";

const cafienneService = new CafienneService();

export default class CaseFileService {
    /**
     * Get the CaseFile of the specified case instance
     * @param Case 
     * @param user 
     */
    async getCaseFile(Case: Case, user: User) {
        const json = await cafienneService.get(`/cases/${Case.id}/casefile`, user).then(checkJSONResponse);
        return json;
    }

    /**
     * Get the case file item of the specified path.
     * E.g., on Helloworld you can get with path 'Greeting/Message'
     * @param Case 
     * @param user 
     * @param path 
     * @param index Optional index if the case file item has multiplicity * (e.g., Order/Lines[12])
     */
    async getCaseFileItem(Case: Case, user: User, path: string, index?: number) {
        path = path + (index !== undefined ? `[${index}]` : ''); // Add optional index to the path
        const json = await cafienneService.get(`/cases/${Case.id}/casefile?${path}`, user).then(checkJSONResponse);
        return json;
    }

    /**
     * Create case file item contents in the specified path
     * @param Case 
     * @param user 
     * @param path 
     * @param data Any json structure matching the case file definition
     */
    async createCaseFileItem(Case: Case, user: User, path: string, data: object) {
        const response = await cafienneService.post(`/cases/${Case.id}/casefile/create/${path}`, user, data);
        return response;
    }

    /**
     * Update case file item contents
     * @param Case
     * @param user 
     * @param path 
     * @param data 
     */
    async updateCaseFileItem(Case: Case, user: User, path: string, data: any) {
        const response = await cafienneService.put(`/cases/${Case.id}/casefile/update/${path}`, user, data);
        return response;
    }

    /**
     * Replace case file item contents
     * @param Case 
     * @param user 
     * @param path 
     * @param data 
     */
    async replaceCaseFileItem(Case: Case, user: User, path: string, data: object) {
        const response = await cafienneService.put(`/cases/${Case.id}/casefile/replace/${path}`, user, data);
        return response;
    }

    /**
     * Delete a case file item
     * @param Case 
     * @param user 
     * @param path 
     */
    async deleteCaseFileItem(Case: Case, user: User, path: string) {
        const response = await cafienneService.delete(`/cases/${Case.id}/casefile/delete/${path}`, user);
        return response;
    }
}