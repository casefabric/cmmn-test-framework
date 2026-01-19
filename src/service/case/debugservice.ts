import Case from '../../cmmn/case';
import CaseEngineEvent from '../../cmmn/event/caseengineevent';
import Trace from '../../util/async/trace';
import Tenant from '../../tenant/tenant';
import User from '../../user';
import CaseEngineService from '../caseengineservice';

export default class DebugService {
    /**
     * Retrieve model events from the backend for a specific ModelActor
     * @param model Id of the model to retrieve events from  
     * @param user 
     */
    static async getEvents(model: string | Case | Tenant, user?: User) {
        const json = await CaseEngineService.get('/debug/' + model, user);
        return json;
    }

    static async getParsedEvents(model: string | Case | Tenant, user?: User, trace: Trace = new Trace()): Promise<Array<CaseEngineEvent>> {
        const response = await this.getEvents(model, user);
        return response.validateArray(CaseEngineEvent, 'Expecting model events', 200, trace);
    }

    static async forceRecovery(user: User, model: string | Case | Tenant) {
        return await CaseEngineService.patch(user, `/debug/force-recovery/${model}`)
    }
}
