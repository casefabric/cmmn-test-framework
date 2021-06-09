import Tenant from '../../tenant/tenant';
import User from '../../user';
import CafienneService from '../cafienneservice';
import { checkJSONResponse } from '../response';

const cafienneService = new CafienneService();

export default class DebugService {
    /**
     * Retrieve model events from the backend for a specific ModelActor
     * @param model Id of the model to retrieve events from  
     * @param user 
     */
    async getEvents(model: string, user?: User) {
        const json = await cafienneService.get('/debug/' + model, user);
        return json;
    }

    async getParsedEvents(model: string, user?: User) {
        const response = await this.getEvents(model, user);
        return checkJSONResponse(response, 'Expecting model events', 200, [Object]);
    }

    async forceRecovery(user: User, modelId: string) {
        return await cafienneService.patch(user, `/debug/force-recovery/${modelId}`)
    }
}