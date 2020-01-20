import User from '../../user';
import CafienneService from '../cafienneservice';
import Case from '../../cmmn/case';
import CaseFilter from './casefilter';
import StartCase from './startcase';

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
        const json = await cafienneService.postForJson(url, user, request);
        // Hack: copy "StartCaseResponse.caseInstanceId" to "CaseInstance.id" in the json prior to instantiating CaseInstance.
        // TODO: consider whether it is better to work with a "StartCaseResponse" object instead
        json.id = json.caseInstanceId;
        const caseInstance = <Case> json;
        console.log("Created case instance with id: \t" + caseInstance.id);
        return caseInstance;
    }

    /**
     * Fetches and refreshes the case information from the backend
     * @param Case 
     * @param user 
     */
    async getCase(Case: Case, user: User) {
        if (!Case.id) {
            console.log("Oops. First try to succesfully start a case ?!");
            return Case;
        }
        const json = await cafienneService.getJson('/cases/' + Case.id, user);

        // console.log("\n\n" + JSON.stringify(json, undefined, 2))

        return <Case> json;
    }

    /**
     * Fetches the XML file with the CaseDefinition of the case instance.
     * @param Case 
     * @param user 
     */
    async getDefinition(Case: Case, user: User) {
        throw new Error('This functionality is not yet implemented');
        if (!Case.id) {
            console.log("Oops. First try to succesfully start a case ?!");
            return Case;
        }
        const xml = await cafienneService.getXml('/cases/definition/' + Case.id, user);
    }

    /**
     * Fetch cases for the user (optionally matching the filter)
     * @param filter 
     * @param user 
     */
    async getCases(user: User, filter?: CaseFilter) {
        const json = await cafienneService.getJson('/cases', user, filter);
        const jsonArray = <Array<any>>json;
        return jsonArray.map(instance => <Case> instance)
    }
}
