import User from "../../user";
import Case from "../../cmmn/case";
import CafienneService from "../cafienneservice";
import { checkJSONResponse, checkResponse } from "../response";
import CaseFileItemDocumentation from "../../cmmn/casefileitemdocumentation";
import { checkCaseID } from "./caseservice";
import Config from '../../../config';

import FormData from 'form-data';
import { createReadStream } from 'fs';
import { resolveFileName } from "./repositoryservice";

const cafienneService = new CafienneService();

export default class CaseFileService {
    /**
     * Get the CaseFile of the specified case instance
     * @param Case 
     * @param user 
     */
    async getCaseFile(user: User, Case: Case | string, expectedStatusCode: number = 200) {
        const caseId = checkCaseID(Case);
        const response = await cafienneService.get(`/cases/${caseId}/casefile`, user);
        const msg = `GetCaseFile is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkJSONResponse(response, msg, expectedStatusCode);
    }

    /**
     * Get the plan item's documentation
     * @param Case 
     * @param user 
     * @param planItemId
     */
    async getCaseFileDocumentation(user: User, Case: Case | string, expectedStatusCode: number = 200): Promise<Array<CaseFileItemDocumentation>> {
        const caseId = checkCaseID(Case);
        const response = await cafienneService.get(`/cases/${caseId}/documentation/casefile`, user);
        const msg = `GetPlanItem is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkJSONResponse(response, msg, expectedStatusCode, [CaseFileItemDocumentation]);
    }

    /**
     * Create case file item contents in the specified path
     * @param Case 
     * @param user 
     * @param path 
     * @param data Any json structure matching the case file definition
     */
    async createCaseFileItem(user: User, Case: Case | string, path: string, data: object, expectedStatusCode: number = 200) {
        const caseId = checkCaseID(Case);
        const response = await cafienneService.post(`/cases/${caseId}/casefile/create/${encodeURI(path)}`, user, data);
        const msg = `CreateCaseFileItem is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Update case file item contents
     * @param Case
     * @param user 
     * @param path 
     * @param data 
     */
    async updateCaseFileItem(user: User, Case: Case | string, path: string, data: any, expectedStatusCode: number = 200) {
        const caseId = checkCaseID(Case);
        const response = await cafienneService.put(`/cases/${caseId}/casefile/update/${encodeURI(path)}`, user, data);
        const msg = `UpdateCaseFileItem is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Replace case file item contents
     * @param Case 
     * @param user 
     * @param path 
     * @param data 
     */
    async replaceCaseFileItem(user: User, Case: Case | string, path: string, data: object, expectedStatusCode: number = 200) {
        const caseId = checkCaseID(Case);
        const response = await cafienneService.put(`/cases/${caseId}/casefile/replace/${encodeURI(path)}`, user, data);
        const msg = `ReplaceCaseFileItem is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Delete a case file item
     * @param Case 
     * @param user 
     * @param path 
     */
    async deleteCaseFileItem(user: User, Case: Case | string, path: string, expectedStatusCode: number = 200) {
        const caseId = checkCaseID(Case);
        const response = await cafienneService.delete(`/cases/${caseId}/casefile/delete/${encodeURI(path)}`, user);
        const msg = `DeleteCaseFileItem is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Upload a document into the case file item
     * @param user 
     * @param Case 
     * @param path 
     * @param fileName 
     * @param metadata 
     * @param expectedStatusCode 
     */
    async uploadCaseFileDocument(user: User, Case: Case, path: string, metadata: any = {}, fileNames: Array<string>, expectedStatusCode: number = 200) {
        // Create a form object and stream all files into it
        const form = new FormData();
        fileNames.forEach(fileName => {
            const readStream = createReadStream(resolveFileName(fileName));
            form.append('file', readStream);    
        });
        form.append('content', JSON.stringify(metadata));

        const response = await cafienneService.postDocument(user, `/cases/${Case.id}/casefile/upload/${encodeURI(path)}`, form);
        const msg = `UploadCaseFileDocument is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Retrieve upload information for the case (i.e., which type of documents can be uploaded into which case file items)
     * @param user 
     * @param Case 
     * @param expectedStatusCode 
     */
    async getUploadInformation(user: User, Case: Case, expectedStatusCode: number = 200) {
        const response = await cafienneService.get(`/cases/${Case.id}/casefile/upload-information`, user);
        const msg = `UploadInformation is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkJSONResponse(response, msg, expectedStatusCode);
    }

    /**
     * Retrieves a list of URLs that can be downloaded for the case instance
     * @param user 
     * @param Case 
     * @param expectedStatusCode 
     */
    async getDownloadInformation(user: User, Case: Case, expectedStatusCode: number = 200) {
        const response = await cafienneService.get(`/cases/${Case.id}/casefile/download-information`, user);
        const msg = `DownloadInformation is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkJSONResponse(response, msg, expectedStatusCode, Array);
    }

    /**
     * Download a document from the case file item
     * @param user
     * @param Case 
     * @param path 
     * @param expectedStatusCode 
     */
    async downloadCaseFileDocument(user: User, Case: Case, path: string, expectedStatusCode: number = 200) {
        const response = await cafienneService.get(`/cases/${Case.id}/casefile/download/${encodeURI(path)}`, user);
        const msg = `DownloadCaseFileDocument is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Download a document from the URL as given by the return value from getDownloadInformation
     * (no need to specify case instance)
     * @param user 
     * @param url 
     * @param expectedStatusCode 
     */
    async downloadURL(user: User, url: string, expectedStatusCode: number = 200) {
        const response = await cafienneService.get(`${encodeURI(url)}`, user);
        const msg = `DownloadURL(${url}) is not expected to succeed for user ${user.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Create case file contents
     * @param Case 
     * @param user 
     * @param path 
     * @param data Any json structure matching the case file definition
     */
    async createCaseFile(user: User, Case: Case | string, data: object, expectedStatusCode: number = 200) {
        const caseId = checkCaseID(Case);
        const response = await cafienneService.post(`/cases/${caseId}/casefile/create/`, user, data);
        const msg = `CreateCaseFile is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Update case file contents
     * @param Case
     * @param user 
     * @param path 
     * @param data 
     */
    async updateCaseFile(user: User, Case: Case | string, data: any, expectedStatusCode: number = 200) {
        const caseId = checkCaseID(Case);
        const response = await cafienneService.put(`/cases/${caseId}/casefile/update/`, user, data);
        const msg = `UpdateCaseFile is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Replace case file
     * @param Case 
     * @param user 
     * @param path 
     * @param data 
     */
    async replaceCaseFile(user: User, Case: Case | string, data: object, expectedStatusCode: number = 200) {
        const caseId = checkCaseID(Case);
        const response = await cafienneService.put(`/cases/${caseId}/casefile/replace/`, user, data);
        const msg = `ReplaceCaseFile is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Delete entire case file 
     * @param Case 
     * @param user 
     * @param path 
     */
    async deleteCaseFile(user: User, Case: Case | string, expectedStatusCode: number = 200) {
        const caseId = checkCaseID(Case);
        const response = await cafienneService.delete(`/cases/${caseId}/casefile/delete/`, user);
        const msg = `DeleteCaseFile is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkResponse(response, msg, expectedStatusCode);
    }
}
