import { checkJSONResponse, checkResponse } from "@cafienne/typescript-client";
import Config from "@cafienne/typescript-client/config";
import logger from "@cafienne/typescript-client/logger";
import CafienneService from "@cafienne/typescript-client/service/cafienneservice";
import CafienneResponse from "@cafienne/typescript-client/service/response";
import User from "@cafienne/typescript-client/user";
import BoardRequestDetails from "./boardrequestdetails";

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
    static async startFlow(user: User, board: BoardRequestDetails, postMaterial: any = {}, expectedStatusCode: number = 202, errorMsg = `StartFlow is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Starting flow in board ${board}`);
        const response = await CafienneService.post(`/board/${boardId(board)}/flow`, user, postMaterial).then(updateLastModified);
        return checkJSONResponse(response, errorMsg, expectedStatusCode).then(object => {
            postMaterial.id = object.flowId;
            return postMaterial;
        });
    }

    static async claimFlowTask(user: User, board: BoardRequestDetails|string, flowId: string, taskId: string, expectedStatusCode: number = 202, errorMsg = `StartFlow is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Claiming task in flow in board ${board}`);
        const response = await CafienneService.put(`/board/${boardId(board)}/flow/${flowId}/tasks/${taskId}/claim`, user).then(updateLastModified);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async saveFlowTask(user: User, board: BoardRequestDetails|string, flowId: string, taskId: string, subject: string, output: any, expectedStatusCode: number = 202, errorMsg = `StartFlow is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Saving task in flow in board ${board}`);
        const postMaterial = {
            subject, data: output
        }
        const response = await CafienneService.put(`/board/${boardId(board)}/flow/${flowId}/tasks/${taskId}`, user, postMaterial).then(updateLastModified);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async completeFlowTask(user: User, board: BoardRequestDetails|string, flowId: string, taskId: string, subject: string, output: any, expectedStatusCode: number = 202, errorMsg = `StartFlow is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Completing task in flow in board ${board}`);
        const postMaterial = {
            subject, data: output
        }
        const response = await CafienneService.post(`/board/${boardId(board)}/flow/${flowId}/tasks/${taskId}`, user, postMaterial).then(updateLastModified);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static get BOARD_LAST_MODIFIED(): any {
        return {
            "Board-Last-Modified": header
        };
    }
}

let header = "";

async function updateLastModified(response: CafienneResponse) {
    // TODO: this currently is not a Singleton, but it should be...
    if (response.ok) {
        const readAndUpdateHeader = (headerName: string) => {
            const headerValue = response.headers.get(headerName);
            if (headerValue) {
                header = headerValue
            }
        }

        readAndUpdateHeader('Board-Last-Modified');
    }
    return response;
}


const boardId = (b: string|BoardRequestDetails): string => {
    if (typeof(b) === 'string') return b;
    else return b.id || '';
}