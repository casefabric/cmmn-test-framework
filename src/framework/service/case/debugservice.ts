import User from '../../user';
import CafienneService from '../cafienneservice';

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
}