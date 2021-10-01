import Tenant from '../../tenant/tenant';
import User from '../../user';
import CafienneService from '../cafienneservice';
import { checkJSONResponse } from '../response';

export default class DebugService {
    /**
     * Retrieve model events from the backend for a specific ModelActor
     * @param model Id of the model to retrieve events from  
     * @param user 
     */
    static async getEvents(model: string, user?: User) {
        const json = await CafienneService.get('/debug/' + model, user);
        return json;
    }

    static async getParsedEvents(model: string, user?: User) {
        const response = await this.getEvents(model, user);
        return checkJSONResponse(response, 'Expecting model events', 200, [Object]);
    }

    static async forceRecovery(user: User, modelId: string) {
        return await CafienneService.patch(user, `/debug/force-recovery/${modelId}`)
    }
}