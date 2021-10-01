import User from '../../user';
import CafienneService from '../cafienneservice';
import Case from '../../cmmn/case';
import CaseFilter from './casefilter';
import StartCase from './startcase';
import StatisticsFilter from './statisticsfilter';
import DiscretionaryItem from '../../cmmn/discretionaryitem';
import { checkJSONResponse, checkResponse } from '../response';
import { DiscretionaryItemsResponse } from './response/discretionaryitemsresponse';
import { CaseStatistics } from './response/casestatistics';
import CaseTeam from '../../cmmn/caseteam';

export default class CaseService {
    static async startCase(user: User, command: StartCase, expectedStatusCode: number = 200): Promise<Case> {
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
            definition: command.definition,
            tenant: command.tenant,
            caseInstanceId,
            debug
        }
        const response = await CafienneService.post(url, user, request);
        const msg = `StartCase is not expected to succeed for user ${user ? user.id : 'anonymous'}`;
        const json = await checkJSONResponse(response, msg, expectedStatusCode, Case);

        // Hack: copy "StartCaseResponse.caseInstanceId" to "Case.id" in the json prior to instantiating Case.
        // TODO: consider whether it is better to work with a "StartCaseResponse" object instead
        if (response.ok) {
            json.id = json.caseInstanceId;
            console.log(`Created case instance with id: \t${json.id}`);
        }
        return json;
    }

    /**
     * Fetches and refreshes the case information from the backend
     * @param caseId 
     * @param user 
     */
    static async getCase(user: User, caseId: Case | string, expectedStatusCode: number = 200): Promise<Case> {
        const convertCaseTeamFormat = (json: any) => {
            if (json.team && !json.team.members) json.team = new CaseTeam(json.team);
            return json;
        }
        const response = await CafienneService.get(`/cases/${caseId}`, user);
        const msg = `GetCase is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkJSONResponse(response, msg, expectedStatusCode, Case).then(convertCaseTeamFormat);
    }

    /**
     * Fetches the XML file with the CaseDefinition of the case instance.
     * @param Case 
     * @param user 
     */
    static async getDefinition(user: User, caseId: Case | string, expectedStatusCode: number = 200): Promise<Document> {
        return CafienneService.getXml(`/cases/${caseId}/definition`, user);
    }

    /**
     * Fetch cases for the user (optionally matching the filter)
     * @param filter 
     * @param user 
     */
    static async getCases(user: User, filter?: CaseFilter, expectedStatusCode: number = 200): Promise<Array<Case>> {
        const response = await CafienneService.get('/cases', user, filter);
        const msg = `GetCases is not expected to succeed for user ${user.id}`;
        return checkJSONResponse(response, msg, expectedStatusCode, [Case]);
    }

    /**
     * Retrieves the list of discretionary items of the case instance
     * @param Case 
     * @param user 
     */
    static async getDiscretionaryItems(user: User, caseId: Case | string, expectedStatusCode: number = 200): Promise<DiscretionaryItemsResponse> {
        const response = await CafienneService.get(`/cases/${caseId}/discretionaryitems`, user)
        const msg = `GetDiscretionaryItems is not expected to succeed for user ${user.id} in case ${caseId}`;
        return await checkJSONResponse(response, msg, expectedStatusCode, DiscretionaryItemsResponse);
    }

    /**
     * Add a discretionary item to the case plan.
     * @param Case
     * @param user User planning the item
     * @param item Item to be planned.
     * @param planItemId Optional id for the plan item resulting of the planning. If not specified, server will generate one.
     * @returns The id of the newly planned item
     */
    static async planDiscretionaryItem(user: User, caseId: Case | string, item: DiscretionaryItem, planItemId?: string, expectedStatusCode: number = 200): Promise<string> {
        const itemToPlan = { name: item.name, parentId: item.parentId, definitionId: item.definitionId, planItemId }

        const response = await CafienneService.post(`/cases/${caseId}/discretionaryitems/plan`, user, itemToPlan);
        const msg = `PlanDiscretionaryItem is not expected to succeed for user ${user.id} in case ${caseId}`;
        const json = await checkJSONResponse(response, msg, expectedStatusCode);
        return json.planItemId;
    }

    /**
     * Fetch statistics of cases across the system.
     * @param user 
     * @param filter 
     */
    static async getCaseStatistics(user: User, filter?: StatisticsFilter, expectedStatusCode: number = 200): Promise<Array<CaseStatistics>> {
        const response = await CafienneService.get('/cases/stats', user, filter);
        const msg = `GetCaseStatistics is not expected to succeed for user ${user.id}`;
        return checkJSONResponse(response, msg, expectedStatusCode, [CaseStatistics]);
    }

    /**
     * Enable or disable debug mode in the specified Case instance
     * @param Case 
     * @param user 
     * @param debugEnabled 
     */
    static async changeDebugMode(user: User, caseId: Case | string, debugEnabled: boolean, expectedStatusCode: number = 200) {
        const response = await CafienneService.put(`/cases/${caseId}/debug/${debugEnabled}`, user);
        const msg = `ChangeDebugMode is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkResponse(response, msg, expectedStatusCode);
    }
}
