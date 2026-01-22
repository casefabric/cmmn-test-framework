import User from '../../user';
import Trace from '../../util/async/trace';
import CaseEngineService from '../caseengineservice';
import IdentifierFilter from './identifierfilter';

export default class CaseIdentifierService {
    /**
     * Fetch identifiers for the user (optionally matching the filter)
     * @param filter 
     * @param user 
     */
    static async getIdentifiers(user: User, filter?: IdentifierFilter, expectedStatusCode: number = 200, msg = `GetIdentifiers is not expected to succeed for user ${user}`, trace: Trace = new Trace()): Promise<Array<CaseIdentifier>> {
        const response = await CaseEngineService.get('/identifiers', user, filter);
        return response.validateArray(CaseIdentifier, msg, expectedStatusCode, trace);
    }

    /**
     * Fetch identifiers for the user (optionally matching the filter)
     * @param filter 
     * @param user 
     */
    static async getIdentifierNames(user: User, filter?: IdentifierFilter, expectedStatusCode: number = 200, msg = `GetIdentifiers is not expected to succeed for user ${user}`, trace: Trace = new Trace()): Promise<Array<String>> {
        const response = await CaseEngineService.get('/identifiers/names', user, filter);
        return response.validateArray(String, msg, expectedStatusCode, trace);
    }
}

export class CaseIdentifier {
    public name: string = '';
    public value: string = '';
}
