import User from '../user';
import CafienneService from './cafienneservice';
import CaseInstance from '../cmmn/case';


const cafienneService = new CafienneService();


export default class CaseService {
    async start(Case: CaseInstance, user: User) {
        if (!user) {
            throw new Error("User must be specified");
        }
        console.log("Creating Case[" + Case.definition + "] in tenant " + Case.tenant);
        const url = '/cases';
        const caseInstanceId = Case.caseInstanceId ? Case.caseInstanceId : undefined;
        const request = {
            inputs : Case.inputs,
            caseTeam: Case.caseTeam,
            definition: Case.definition,
            tenant: Case.tenant,
            caseInstanceId
        }
        const json = await cafienneService.postForJson(url, request, user);
        console.log("Created case instance: ", json);
        Case.caseInstanceId = json.caseInstanceId;
        return Case;
    }


    async getCase(Case: CaseInstance, user: User) {
        if (!Case.caseInstanceId) {
            console.log("Oops. First try to succesfully start a case ?!");
            return Case;
        }
        const json = await cafienneService.get('/cases/' + Case.caseInstanceId, user);
        return Case.fillFromJson(json);
    }
}
