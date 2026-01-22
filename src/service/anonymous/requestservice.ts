import Case from '../../cmmn/case';
import User from '../../user';
import Trace from '../../util/async/trace';
import CaseEngineService from '../caseengineservice';

export default class RequestService {
    static async requestCase(casePath: string = '', inputs: any, caseInstanceId?: string, debug?: boolean, expectedStatusCode: number = 200, trace: Trace = new Trace()): Promise<Case> {
        console.log("Anonymously requesting Case[" + casePath + "]");
        const url = `/request/case/${casePath}`;
        const response = await CaseEngineService.post(url, User.NONE, { inputs, caseInstanceId, debug });
        const msg = `Anonymously requesting Case is not expected to succeed`;
        const json = await response.validateObject(Case, msg, expectedStatusCode, trace);
        return json;
    }
}
