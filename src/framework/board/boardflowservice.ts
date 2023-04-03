import { checkJSONResponse, checkResponse } from "@cafienne/typescript-client";
import Config from "@cafienne/typescript-client/config";
import logger from "@cafienne/typescript-client/logger";
import User from "@cafienne/typescript-client/user";
import BoardDefinition, { Flow } from "./boarddefinition";
import CafienneService from "./cafienneservice";

/**
 * Connection to the /board APIs of Cafienne
 */
export default class BoardFlowService {

    /**
     * Deletes the case on behalf of the user. User must be a tenant owner.
     * @param user
     * @param board 
     * @param expectedStatusCode 
     */
    static async startFlow(user: User, board: BoardDefinition, postMaterial: any = {}, expectedStatusCode: number = 202, errorMsg = `StartFlow is not expected to succeed for user ${user} on board ${board}`): Promise<Flow> {
        if (Config.PlatformService.log) logger.debug(`Starting flow in board ${board}`);
        const response = await CafienneService.post(`/boards/${board}/flows`, user, postMaterial);
        return checkJSONResponse(response, errorMsg, expectedStatusCode).then(object => {
            postMaterial.id = object.flowId;
            return Object.assign(new Flow(object.flowId), postMaterial);
        });
    }

    static async claimFlowTask(user: User, board: BoardDefinition|string, flow: string|Flow, taskId: string, expectedStatusCode: number = 202, errorMsg = `ClaimFlowTask is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Claiming task in flow ${flow} in board ${board}`);
        const response = await CafienneService.put(`/boards/${board}/flows/${flow}/tasks/${taskId}/claim`, user);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async saveFlowTask(user: User, board: BoardDefinition|string, flow: string|Flow, taskId: string, subject: string, output: any, expectedStatusCode: number = 202, errorMsg = `SaveFlowTask is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Saving task in flow ${flow} in board ${board}`);
        const postMaterial = {
            subject, data: output
        }
        const response = await CafienneService.put(`/boards/${board}/flows/${flow}/tasks/${taskId}`, user, postMaterial);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async completeFlowTask(user: User, board: BoardDefinition|string, flow: string|Flow, taskId: string, subject: string, output: any, expectedStatusCode: number = 202, errorMsg = `CompleteFlowTask is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Completing task in flow ${flow} in board ${board}`);
        const postMaterial = {
            subject, data: output
        }
        const response = await CafienneService.post(`/boards/${board}/flows/${flow}/tasks/${taskId}`, user, postMaterial);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }
}
