import User from '../../user';
import CafienneService from '../cafienneservice';
import Case from '../../cmmn/case';
import CaseFilter from './casefilter';
import StartCase from './startcase';
import StatisticsFilter from './statisticsfilter';
import DiscretionaryItem from '../../cmmn/discretionaryitem';
import { checkJSONResponse } from '../response';

const cafienneService = new CafienneService();

export default class CaseService {
    async startCase(command: StartCase, user: User): Promise<Case> {
        if (!user) {
            throw new Error("User must be specified");
        }
        console.log("Creating Case[" + command.definition + "] in tenant " + command.tenant);
        const url = '/cases';
        const caseInstanceId = command.caseInstanceId ? command.caseInstanceId : undefined;
        const request = {
            inputs: command.inputs,
            caseTeam: command.caseTeam,
            definition: command.definition,
            tenant: command.tenant,
            caseInstanceId
        }
        const json = await cafienneService.post(url, user, request).then(checkJSONResponse);
        // Hack: copy "StartCaseResponse.caseInstanceId" to "Case.id" in the json prior to instantiating Case.
        // TODO: consider whether it is better to work with a "StartCaseResponse" object instead
        json.id = json.caseInstanceId;
        const caseInstance = <Case>json;
        console.log("Created case instance with id: \t" + caseInstance.id);
        return caseInstance;
    }

    /**
     * Fetches and refreshes the case information from the backend
     * @param Case 
     * @param user 
     */
    async getCase(Case: Case, user: User) {
        checkCaseID(Case);
        const json = await cafienneService.get('/cases/' + Case.id, user).then(checkJSONResponse);

        // console.log("\n\n" + JSON.stringify(json, undefined, 2))

        return <Case>json;
    }

    /**
     * Fetches the XML file with the CaseDefinition of the case instance.
     * @param Case 
     * @param user 
     */
    async getDefinition(Case: Case, user: User) {
        throw new Error('This functionality is not yet implemented');
        checkCaseID(Case);
        const xml = await cafienneService.getXml('/cases/definition/' + Case.id, user);
    }

    /**
     * Fetch cases for the user (optionally matching the filter)
     * @param filter 
     * @param user 
     */
    async getCases(user: User, filter?: CaseFilter) {
        const json = await cafienneService.get('/cases', user, filter).then(checkJSONResponse);
        const caseArray = <Array<Case>>json;
        return caseArray;
    }

    /**
     * Retrieves the list of cases for the user (those that the user started or participates in).
     * @param user 
     */
    async getUserCases(user: User, filter?: CaseFilter) {
        const json = await cafienneService.get('/cases/user', user, filter).then(checkJSONResponse);
        const caseArray = <Array<Case>>json;
        return caseArray;
    }

    /**
     * Retrieves the list of discretionary items of the case instance
     * @param Case 
     * @param user 
     */
    async getDiscretionaryItems(Case: Case, user: User) {
        checkCaseID(Case);
        const json = await cafienneService.get('/cases/' + Case.id + '/discretionaryitems', user).then(checkJSONResponse);
        const response = <DiscretionaryItemsResponse> json;
        return response.discretionaryItems;
    }

    /**
     * Add a discretionary item to the case plan.
     * @param Case
     * @param user User planning the item
     * @param item Item to be planned.
     * @param planItemId Optional id for the plan item resulting of the planning. If not specified, server will generate one.
     * @returns The id of the newly planned item
     */
    async planDiscretionaryItem(Case: Case, user: User, item: DiscretionaryItem, planItemId?: string): Promise<string> {
        checkCaseID(Case);
        const itemToPlan = { name : item.name, parentId: item.parentId, definitionId: item.definitionId, planItemId}
        const json = await cafienneService.post('cases/' + Case.id + '/discretionaryitems/plan', user, itemToPlan).then(checkJSONResponse);
        return json.planItemId;
    }

    /**
     * Fetch statistics of cases across the system.
     * @param user 
     * @param filter 
     */
    async getCaseStatistics(user: User, filter?: StatisticsFilter) {
        const json = await cafienneService.get('/cases/stats', user, filter).then(checkJSONResponse);
        return <Array<Case>>json;
    }

    /**
     * Enable or disable debug mode in the specified Case instance
     * @param Case 
     * @param user 
     * @param debugEnabled 
     */
    async changeDebugMode(Case: Case, user: User, debugEnabled: boolean) {
        checkCaseID(Case);
        const response = await cafienneService.put('cases/' + Case.id + '/debug/' + debugEnabled, user);
        return response;
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
