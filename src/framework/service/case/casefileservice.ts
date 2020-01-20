import User from "../../user";
import Case from "../../cmmn/case";

export default class CaseFileService {
    /**
     * Get the CaseFile of the specified case instance
     * @param Case 
     * @param user 
     */
    async getCaseFile(Case: Case, user: User) {
        throw new Error('Not yet implemented')
    }

    async createCaseFileItem(Case: Case, user: User, path: string, data: object) {
        throw new Error('Not yet implemented')
    }

    async updateCaseFileItem(Case: Case, user: User, path: string, data: object) {
        throw new Error('Not yet implemented')
    }

    async replaceCaseFileItem(Case: Case, user: User, path: string, data: object) {
        throw new Error('Not yet implemented')
    }

    /**
     * Delete a case file item
     * @param Case 
     * @param user 
     * @param path 
     */
    async deleteCaseFileItem(Case: Case, user: User, path: string) {
        throw new Error('Not yet implemented')
    }



}