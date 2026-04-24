import Case from '../../cmmn/case';
import CaseEngineEvent from '../../cmmn/event/caseengineevent';
import ModelEvent from '../../cmmn/event/model/modelevent';
import Tenant from '../../tenant/tenant';
import User from '../../user';
import Trace from '../../util/async/trace';
import CaseEngineService from '../caseengineservice';

export default class DebugService {
    /**
     * Retrieve model events from the backend for a specific ModelActor
     * @param model Id of the model to retrieve events from  
     * @param user 
     */
    static async getEvents(model: string | Case | Tenant, user?: User, from: number = 0, to?: number, trace: Trace = new Trace()) {
        const fromParameter = from > 0 ? `from=${from}` : '';
        const toParameter = from > 0 ? `to=${to}` : '';
        let parameters = fromParameter.length || toParameter.length ? '?' : '';
        if (fromParameter) {
            parameters = parameters + fromParameter;
        }
        if (toParameter.length) {
            parameters = parameters + (fromParameter.length ? '&' : '') + toParameter;
        }
        return await CaseEngineService.get('/debug/' + model + parameters, user);
    }

    static async getParsedEvents(model: string | Case | Tenant, user?: User, from: number = 0, to?: number, trace: Trace = new Trace()): Promise<ModelEvent[]> {
        const response = await this.getEvents(model, user, from, to, trace);
        const events = await response.validateArray(CaseEngineEvent, 'Expecting model events', 200, trace);
        return events.map(event => event.content);
    }

    static async forceRecovery(user: User, model: string | Case | Tenant) {
        return await CaseEngineService.patch(user, `/debug/force-recovery/${model}`)
    }
}
