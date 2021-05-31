import User from '../../user';
import CafienneService from '../cafienneservice';
import { checkJSONResponse } from '../response';
import IdentifierFilter from './identifierfilter';

const cafienneService = new CafienneService();

export default class CaseIdentifierService {
    /**
     * Fetch identifiers for the user (optionally matching the filter)
     * @param filter 
     * @param user 
     */
    async getIdentifiers(user: User, filter?: IdentifierFilter, expectedStatusCode: number = 200): Promise<Array<any>> {
        const response = await cafienneService.get('/identifiers', user, filter);
        const msg = `GetIdentifiers is not expected to succeed for user ${user.id}`;
        return checkJSONResponse(response, msg, expectedStatusCode) as Promise<Array<any>>;
    }

    /**
     * Fetch identifiers for the user (optionally matching the filter)
     * @param filter 
     * @param user 
     */
     async getIdentifierNames(user: User, filter?: IdentifierFilter, expectedStatusCode: number = 200): Promise<Array<any>> {
        const response = await cafienneService.get('/identifiers/names', user, filter);
        const msg = `GetIdentifiers is not expected to succeed for user ${user.id}`;
        return checkJSONResponse(response, msg, expectedStatusCode) as Promise<Array<any>>;
    }

}
