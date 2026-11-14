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
 * Connection to the /ai APIs of the AI image of the case engine (cafienne/engine:latest-ai).
 * Each call takes an optional node: the URL of one engine node (as given with -urls), for tests of a cluster;
 * without it, the call goes to any configured node.
 */
export default class AiService {
    private static at(path: string, node?: string) {
        return node ? (node.endsWith('/') ? node : node + '/') + path.substring(1) : path;
    }

    /**
     * Deploys a version of the AI platform configuration. The user must be a platform owner.
     */
    static async deployConfiguration(user: User, document: object, expectedStatusCode: number = 200, msg = 'Deploying the AI configuration was not expected to succeed', node?: string, trace: Trace = new Trace()): Promise<any> {
        const response = await CaseEngineService.put(this.at('/ai/configuration', node), user, document);
        await response.validate(msg, expectedStatusCode, trace);
        return response.json();
    }

    static async getConfiguration(user: User, expectedStatusCode: number = 200, node?: string, trace: Trace = new Trace()): Promise<any> {
        const response = await CaseEngineService.get(this.at('/ai/configuration', node), user);
        await response.validate('Reading the AI configuration was not expected to succeed', expectedStatusCode, trace);
        return response.json();
    }

    /**
     * Suspends AI calls in scope; tenant owners may do so for their own tenant. Returns the suspension (with its id).
     */
    static async suspend(user: User, suspension: AiSuspensionRequest, expectedStatusCode: number = 201, msg = 'Suspending AI was not expected to succeed', node?: string, trace: Trace = new Trace()): Promise<any> {
        const response = await CaseEngineService.post(this.at('/ai/suspensions', node), user, suspension);
        await response.validate(msg, expectedStatusCode, trace);
        return expectedStatusCode === 201 ? response.json() : response.text();
    }

    static async lift(user: User, id: string, reason: string, expectedStatusCode: number = 200, node?: string, trace: Trace = new Trace()) {
        const response = await CaseEngineService.delete(this.at(`/ai/suspensions/${id}?reason=${encodeURIComponent(reason)}&acknowledgeChange=true`, node), user);
        return response.validate(`Lifting AI suspension ${id} was not expected to succeed`, expectedStatusCode, trace);
    }

    static async getSuspensions(user: User, node?: string, trace: Trace = new Trace()): Promise<Array<any>> {
        const response = await CaseEngineService.get(this.at('/ai/suspensions', node), user);
        await response.validate('Reading the AI suspensions was not expected to succeed', 200, trace);
        return response.json();
    }

    /**
     * The AI calls that have not ended, of all nodes, with the node that runs each
     */
    static async getCalls(user: User, node?: string, trace: Trace = new Trace()): Promise<Array<any>> {
        const response = await CaseEngineService.get(this.at('/ai/calls', node), user);
        await response.validate('Reading the AI calls was not expected to succeed', 200, trace);
        return response.json();
    }

    /**
     * The health of the AI extension on the node, with the id of the node
     */
    static async getHealth(user: User, node?: string, trace: Trace = new Trace()): Promise<any> {
        const response = await CaseEngineService.get(this.at('/ai/health', node), user);
        await response.validate('Reading the AI health was not expected to succeed', 200, trace);
        return response.json();
    }
}
