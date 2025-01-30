import Case from '../../cmmn/case';
import DiscretionaryItem from '../../cmmn/discretionaryitem';
import User from '../../user';
import Trace from '../../util/async/trace';
import CaseEngineService from '../caseengineservice';
import CaseFilter from './casefilter';
import { DiscretionaryItemsResponse } from './response/discretionaryitemsresponse';
import StartCase from './startcase';
import { Document } from '@xmldom/xmldom';

export default class CaseService {
    static async startCase(user: User, command: StartCase, expectedStatusCode: number = 200, msg = `StartCase is not expected to succeed for user ${user ? user.id : 'anonymous'}`, trace: Trace = new Trace()): Promise<Case> {
        if (!user) {
            // throw new Error("User must be specified");
        }
        console.log("Creating Case[" + command.definition + "] in tenant " + command.tenant);
        const url = '/cases';
        const caseInstanceId = command.caseInstanceId ? command.caseInstanceId : undefined;
        const debug = command.debug !== undefined ? command.debug : undefined;
        const request = {
            inputs: command.inputs,
            caseTeam: command.caseTeam,
            definition: command.definition?.toString(),
            tenant: command.tenant?.toString(),
            caseInstanceId,
            debug
        }
        const response = await CaseEngineService.post(url, user, request);
        const json = await response.validateObject(Case, msg, expectedStatusCode, trace);
        return json;
    }

    /**
     * Fetches and refreshes the case information from the backend
     * @param caseId 
     * @param user 
     */
    static async getCase(user: User, caseId: Case | string, expectedStatusCode: number = 200, msg = `GetCase is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()): Promise<Case> {
        return CaseEngineService.get(`/cases/${caseId}`, user).then(response => response.validateObject(Case, msg, expectedStatusCode, trace));
    }

    /**
     * Fetches the XML file with the CaseDefinition of the case instance.
     * @param Case 
     * @param user 
     */
    static async getDefinition(user: User, caseId: Case | string, expectedStatusCode: number = 200): Promise<Document> {
        return CaseEngineService.getXml(`/cases/${caseId}/definition`, user);
    }

    /**
     * Fetch cases for the user (optionally matching the filter)
     * @param filter 
     * @param user 
     */
    static async getCases(user: User, filter?: CaseFilter, expectedStatusCode: number = 200, msg = `GetCases is not expected to succeed for user ${user}`, trace: Trace = new Trace()): Promise<Array<Case>> {
        const response = await CaseEngineService.get('/cases', user, filter);
        return response.validateArray(Case, msg, expectedStatusCode, trace);
    }

    /**
     * Retrieves the list of discretionary items of the case instance
     * @param Case 
     * @param user 
     */
    static async getDiscretionaryItems(user: User, caseId: Case | string, expectedStatusCode: number = 200, msg = `GetDiscretionaryItems is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()): Promise<DiscretionaryItemsResponse> {
        const response = await CaseEngineService.get(`/cases/${caseId}/discretionaryitems`, user)
        return response.validateObject(DiscretionaryItemsResponse, msg, expectedStatusCode, trace);
    }

    /**
     * Add a discretionary item to the case plan.
     * @param Case
     * @param user User planning the item
     * @param item Item to be planned.
     * @param planItemId Optional id for the plan item resulting of the planning. If not specified, server will generate one.
     * @returns The id of the newly planned item
     */
    static async planDiscretionaryItem(user: User, caseId: Case | string, item: DiscretionaryItem, planItemId?: string, expectedStatusCode: number = 200, msg = `PlanDiscretionaryItem is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()): Promise<string> {
        const itemToPlan = { name: item.name, parentId: item.parentId, definitionId: item.definitionId, planItemId }

        const response = await CaseEngineService.post(`/cases/${caseId}/discretionaryitems/plan`, user, itemToPlan);
        const json: any = await response.validateObject(Object, msg, expectedStatusCode, trace);
        return json.planItemId;
    }

    /**
     * Enable or disable debug mode in the specified Case instance
     * @param Case 
     * @param user 
     * @param debugEnabled 
     */
    static async changeDebugMode(user: User, caseId: Case | string, debugEnabled: boolean, expectedStatusCode: number = 200, msg = `ChangeDebugMode is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()) {
        return CaseEngineService.put(`/cases/${caseId}/debug/${debugEnabled}`, user).then(response => response.validate(msg, expectedStatusCode, trace));
    }
}
