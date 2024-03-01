import Case from '../../cmmn/case';
import CafienneEvent from '../../cmmn/event/cafienneevent';
import Trace from '../../infra/trace';
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
    static async getEvents(model: string | Case | Tenant, user?: User) {
        const json = await CafienneService.get('/debug/' + model, user);
        return json;
    }

    static async getParsedEvents(model: string | Case | Tenant, user?: User, trace: Trace = new Trace()): Promise<Array<CafienneEvent>> {
        const response = await this.getEvents(model, user);
        return checkJSONResponse(response, 'Expecting model events', 200, [CafienneEvent], trace);
    }

    static async forceRecovery(user: User, model: string | Case | Tenant) {
        return await CafienneService.patch(user, `/debug/force-recovery/${model}`)
    }
}