import User from '../../user';
import CafienneService from '../cafienneservice';
import Case from '../../cmmn/case';
import { checkJSONResponse } from '../response';

export default class RequestService {
    static async requestCase(casePath: string = '', inputs: any, caseInstanceId?: string, debug?: boolean, expectedStatusCode: number = 200): Promise<Case> {
        console.log("Anonymously requesting Case[" + casePath + "]");
        const url = `/request/case/${casePath}`;
        const response = await CafienneService.post(url, User.NONE, { inputs, caseInstanceId, debug });
        const msg = `Anonymously requesting Case is not expected to succeed`;
        const json = await checkJSONResponse(response, msg, expectedStatusCode, Case);

        // Hack: copy "StartCaseResponse.caseInstanceId" to "Case.id" in the json prior to instantiating Case.
        // TODO: consider whether it is better to work with a "StartCaseResponse" object instead
        if (response.ok) {
            json.id = json.caseInstanceId;
            console.log(`Created case instance with id: \t${json.id}`);
        }
        return json;
    }
}