import Case from '../../cmmn/case';
import User from '../../user';
import Trace from '../../util/async/trace';
import CaseEngineService from '../caseengineservice';
import { checkJSONResponse } from '../response';

export default class RequestService {
    static async requestCase(casePath: string = '', inputs: any, caseInstanceId?: string, debug?: boolean, expectedStatusCode: number = 200, trace: Trace = new Trace()): Promise<Case> {
        console.log("Anonymously requesting Case[" + casePath + "]");
        const url = `/request/case/${casePath}`;
        const response = await CaseEngineService.post(url, User.NONE, { inputs, caseInstanceId, debug });
        const msg = `Anonymously requesting Case is not expected to succeed`;
        const json = await checkJSONResponse(response, msg, expectedStatusCode, Case, trace);

        // Hack: copy "StartCaseResponse.caseInstanceId" to "Case.id" in the json prior to instantiating Case.
        // TODO: consider whether it is better to work with a "StartCaseResponse" object instead
        if (response.ok) {
            json.id = json.caseInstanceId;
            console.log(`Created case instance with id: \t${json.id}`);
        }
        return json;
    }
}