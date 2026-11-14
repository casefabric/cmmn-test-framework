import User from '../../user';
import Trace from '../../util/async/trace';
import CaseEngineService from '../caseengineservice';

export interface AiSuspensionRequest {
    scope: string;
    value?: string;
    tenant?: string;
    reason: string;
    onRunning?: 'kill' | 'pause' | 'finish';
    freezeChanges?: boolean;
}

/**
 * Connection to the /ai APIs of the AI image of the case engine (cafienne/engine:latest-ai)
 */
export default class AiService {
    /**
     * Deploys a version of the AI platform configuration. The user must be a platform owner.
     */
    static async deployConfiguration(user: User, document: object, expectedStatusCode: number = 200, msg = 'Deploying the AI configuration was not expected to succeed', trace: Trace = new Trace()): Promise<any> {
        const response = await CaseEngineService.put('/ai/configuration', user, document);
        await response.validate(msg, expectedStatusCode, trace);
        return response.json();
    }

    static async getConfiguration(user: User, expectedStatusCode: number = 200, trace: Trace = new Trace()): Promise<any> {
        const response = await CaseEngineService.get('/ai/configuration', user);
        await response.validate('Reading the AI configuration was not expected to succeed', expectedStatusCode, trace);
        return response.json();
    }

    /**
     * Suspends AI calls in scope; tenant owners may do so for their own tenant. Returns the suspension (with its id).
     */
    static async suspend(user: User, suspension: AiSuspensionRequest, expectedStatusCode: number = 201, msg = 'Suspending AI was not expected to succeed', trace: Trace = new Trace()): Promise<any> {
        const response = await CaseEngineService.post('/ai/suspensions', user, suspension);
        await response.validate(msg, expectedStatusCode, trace);
        return expectedStatusCode === 201 ? response.json() : response.text();
    }

    static async lift(user: User, id: string, reason: string, expectedStatusCode: number = 200, trace: Trace = new Trace()) {
        const response = await CaseEngineService.delete(`/ai/suspensions/${id}?reason=${encodeURIComponent(reason)}&acknowledgeChange=true`, user);
        return response.validate(`Lifting AI suspension ${id} was not expected to succeed`, expectedStatusCode, trace);
    }

    static async getSuspensions(user: User, trace: Trace = new Trace()): Promise<Array<any>> {
        const response = await CaseEngineService.get('/ai/suspensions', user);
        await response.validate('Reading the AI suspensions was not expected to succeed', 200, trace);
        return response.json();
    }
}
