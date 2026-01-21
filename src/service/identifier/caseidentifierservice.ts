import User from '../../user';
import Trace from '../../util/async/trace';
import CaseEngineService from '../caseengineservice';
import { checkJSONResponse } from '../response';
import IdentifierFilter from './identifierfilter';

export default class CaseIdentifierService {
    /**
     * Fetch identifiers for the user (optionally matching the filter)
     * @param filter 
     * @param user 
     */
    static async getIdentifiers(user: User, filter?: IdentifierFilter, expectedStatusCode: number = 200, msg = `GetIdentifiers is not expected to succeed for user ${user}`, trace: Trace = new Trace()): Promise<Array<any>> {
        const response = await CaseEngineService.get('/identifiers', user, filter);
        return checkJSONResponse(response, msg, expectedStatusCode, undefined, trace);
    }

    /**
     * Fetch identifiers for the user (optionally matching the filter)
     * @param filter 
     * @param user 
     */
     static async getIdentifierNames(user: User, filter?: IdentifierFilter, expectedStatusCode: number = 200, msg = `GetIdentifiers is not expected to succeed for user ${user}`, trace: Trace = new Trace()): Promise<Array<any>> {
        const response = await CaseEngineService.get('/identifiers/names', user, filter);
        return checkJSONResponse(response, msg, expectedStatusCode, undefined, trace);
    }
}
