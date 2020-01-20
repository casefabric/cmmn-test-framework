import User from '../../user';
import CafienneService from '../cafienneservice';
import CaseInstance from '../../cmmn/case';
import CaseFilter from './casefilter';


const cafienneService = new CafienneService();


export default class CaseService {
    async startCase(Case: CaseInstance, user: User) {
        if (!user) {
            throw new Error("User must be specified");
        }
        console.log("Creating Case[" + Case.definition + "] in tenant " + Case.tenant);
        const url = '/cases';
        const caseInstanceId = Case.caseInstanceId ? Case.caseInstanceId : undefined;
        const request = {
            inputs: Case.inputs,
            caseTeam: Case.caseTeam,
            definition: Case.definition,
            tenant: Case.tenant,
            caseInstanceId
        }
        const json = await cafienneService.postForJson(url, user, request);
        console.log("Created case instance with id: \t" + json.caseInstanceId);
        Case.caseInstanceId = json.caseInstanceId;
        return Case;
    }

    /**
     * Fetches and refreshes the case information from the backend
     * @param Case 
     * @param user 
     */
    async getCase(Case: CaseInstance, user: User) {
        if (!Case.caseInstanceId) {
            console.log("Oops. First try to succesfully start a case ?!");
            return Case;
        }
        const json = await cafienneService.getJson('/cases/' + Case.caseInstanceId, user);
        return Case.fillFromJson(json);
    }

    /**
     * Fetches the XML file with the CaseDefinition of the case instance.
     * @param Case 
     * @param user 
     */
    async getDefinition(Case: CaseInstance, user: User) {
        throw new Error('This functionality is not yet implemented');
        if (!Case.caseInstanceId) {
            console.log("Oops. First try to succesfully start a case ?!");
            return Case;
        }
        const xml = await cafienneService.getXml('/cases/definition/' + Case.caseInstanceId, user);
    }

    /**
     * Fetch cases for the user (optionally matching the filter)
     * @param filter 
     * @param user 
     */
    async getCases(user: User, filter?: CaseFilter) {
        const json = await cafienneService.getJson('/cases', user, filter);
        const jsonArray = <Array<any>>json;
        return jsonArray;
        // TODO: convert CaseInstance structure to the JSON response
        // return jsonArray.map(caseInstance => new CaseInstance(caseInstance))


    }
}
