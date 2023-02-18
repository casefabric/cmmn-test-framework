import { checkJSONResponse } from "@cafienne/typescript-client";
import Config from "@cafienne/typescript-client/config";
import logger from "@cafienne/typescript-client/logger";
import CafienneService from "@cafienne/typescript-client/service/cafienneservice";
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
        const response = await CafienneService.post(`/board/${boardId(board)}/flow`, user, postMaterial);
        return checkJSONResponse(response, errorMsg, expectedStatusCode).then(object => {
            postMaterial.id = object.flowId;
            return postMaterial;
        });
    }

}

const boardId = (b: string|BoardRequestDetails): string => {
    if (typeof(b) === 'string') return b;
    else return b.id || '';
}