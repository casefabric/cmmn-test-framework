import User from '../../user';
import CafienneService from '../cafienneservice';
import { checkJSONResponse } from '../response';
import IdentifierFilter from './identifierfilter';

export default class CaseIdentifierService {
    /**
     * Fetch identifiers for the user (optionally matching the filter)
     * @param filter 
     * @param user 
     */
    static async getIdentifiers(user: User, filter?: IdentifierFilter, expectedStatusCode: number = 200): Promise<Array<any>> {
        const response = await CafienneService.get('/identifiers', user, filter);
        const msg = `GetIdentifiers is not expected to succeed for user ${user.id}`;
        return checkJSONResponse(response, msg, expectedStatusCode);
    }

    /**
     * Fetch identifiers for the user (optionally matching the filter)
     * @param filter 
     * @param user 
     */
     static async getIdentifierNames(user: User, filter?: IdentifierFilter, expectedStatusCode: number = 200): Promise<Array<any>> {
        const response = await CafienneService.get('/identifiers/names', user, filter);
        const msg = `GetIdentifiers is not expected to succeed for user ${user.id}`;
        return checkJSONResponse(response, msg, expectedStatusCode);
    }
}
