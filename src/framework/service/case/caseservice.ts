import User from '../../user';
import CafienneService from '../cafienneservice';
import Case from '../../cmmn/case';
import CaseFilter from './casefilter';
import StartCase from './startcase';
import StatisticsFilter from './statisticsfilter';
import DiscretionaryItem from '../../cmmn/discretionaryitem';
import { checkJSONResponse, checkResponse } from '../response';

const cafienneService = new CafienneService();

export default class CaseService {
    async startCase(command: StartCase, user: User, expectNoFailures: boolean = true): Promise<Case> {
        if (!user) {
            throw new Error("User must be specified");
        }
        console.log("Creating Case[" + command.definition + "] in tenant " + command.tenant);
        const url = '/cases';
        const caseInstanceId = command.caseInstanceId ? command.caseInstanceId : undefined;
        const debug = command.debug ? command.debug : undefined;
        const request = {
            inputs: command.inputs,
            caseTeam: command.caseTeam,
            definition: command.definition,
            tenant: command.tenant,
            caseInstanceId,
            debug
        }
        const response = await cafienneService.post(url, user, request);
        const msg = `StartCase is not expected to succeed for user ${user.id}`;
        const json = await checkJSONResponse(response, msg, expectNoFailures);

        // Hack: copy "StartCaseResponse.caseInstanceId" to "Case.id" in the json prior to instantiating Case.
        // TODO: consider whether it is better to work with a "StartCaseResponse" object instead
        json.id = json.caseInstanceId;
        const caseInstance = <Case>json;
        console.log(`Created case instance with id: \t${caseInstance.id}`);
        return caseInstance;
    }

    /**
     * Fetches and refreshes the case information from the backend
     * @param Case 
     * @param user 
     */
    async getCase(Case: Case, user: User, expectNoFailures: boolean = true): Promise<Case> {
        checkCaseID(Case);
        const response = await cafienneService.get('/cases/' + Case.id, user);
        const msg = `GetCase is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkJSONResponse(response, msg, expectNoFailures);
    }

    /**
     * Fetches the XML file with the CaseDefinition of the case instance.
     * @param Case 
     * @param user 
     */
    async getDefinition(Case: Case, user: User, expectNoFailures: boolean = true) {
        throw new Error('This functionality is not yet implemented');
        checkCaseID(Case);
        const xml = await cafienneService.getXml('/cases/definition/' + Case.id, user);
    }

    /**
     * Fetch cases for the user (optionally matching the filter)
     * @param filter 
     * @param user 
     */
    async getCases(user: User, filter?: CaseFilter, expectNoFailures: boolean = true): Promise<Array<Case>> {
        const response = await cafienneService.get('/cases', user, filter);
        const msg = `GetCases is not expected to succeed for user ${user.id}`;
        return checkJSONResponse(response, msg, expectNoFailures) as Promise<Array<Case>>;
    }

    /**
     * Retrieves the list of cases for the user (those that the user started or participates in).
     * @param user 
     */
    async getUserCases(user: User, filter?: CaseFilter, expectNoFailures: boolean = true): Promise<Array<Case>> {        
        const response = await cafienneService.get('/cases/user', user, filter);
        const msg = `GetUserCases is not expected to succeed for user ${user.id}`;
        return checkJSONResponse(response, msg, expectNoFailures) as Promise<Array<Case>>;
    }

    /**
     * Retrieves the list of discretionary items of the case instance
     * @param Case 
     * @param user 
     */
    async getDiscretionaryItems(Case: Case, user: User, expectNoFailures: boolean = true): Promise<DiscretionaryItemsResponse> {
        checkCaseID(Case);
        const response = await cafienneService.get('/cases/' + Case.id + '/discretionaryitems', user)
        const msg = `GetDiscretionaryItems is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return <DiscretionaryItemsResponse> await checkJSONResponse(response, msg, expectNoFailures);
    }

    /**
     * Add a discretionary item to the case plan.
     * @param Case
     * @param user User planning the item
     * @param item Item to be planned.
     * @param planItemId Optional id for the plan item resulting of the planning. If not specified, server will generate one.
     * @returns The id of the newly planned item
     */
    async planDiscretionaryItem(Case: Case, user: User, item: DiscretionaryItem, planItemId?: string, expectNoFailures: boolean = true): Promise<string> {
        checkCaseID(Case);
        const itemToPlan = { name : item.name, parentId: item.parentId, definitionId: item.definitionId, planItemId}

        const response = await cafienneService.post('cases/' + Case.id + '/discretionaryitems/plan', user, itemToPlan);
        const msg = `PlanDiscretionaryItem is not expected to succeed for user ${user.id} in case ${Case.id}`;
        const json = await checkJSONResponse(response, msg, expectNoFailures);
        return json.planItemId;
    }

    /**
     * Fetch statistics of cases across the system.
     * @param user 
     * @param filter 
     */
    async getCaseStatistics(user: User, filter?: StatisticsFilter, expectNoFailures: boolean = true) {
        const response = await cafienneService.get('/cases/stats', user, filter);
        const msg = `GetCaseStatistics is not expected to succeed for user ${user.id}`;
        return checkJSONResponse(response, msg, expectNoFailures) as Promise<Array<Case>>;
    }

    /**
     * Enable or disable debug mode in the specified Case instance
     * @param Case 
     * @param user 
     * @param debugEnabled 
     */
    async changeDebugMode(Case: Case, user: User, debugEnabled: boolean, expectNoFailures: boolean = true) {
        checkCaseID(Case);
        const response = await cafienneService.put('cases/' + Case.id + '/debug/' + debugEnabled, user);
        const msg = `ChangeDebugMode is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectNoFailures);
    }
}

/**
 * Throw an error if Case.id is not filled.
 * @param Case 
 */
function checkCaseID(Case: Case) {
    if (! Case.id) {
        throw new Error('Case id has not been set. First the case has to be started');
    }
}

/**
 * Simple JSON interface wrapper
 */
interface DiscretionaryItemsResponse {
    caseInstanceId: string;
    name: string,
    discretionaryItems: Array<DiscretionaryItem>;
}
