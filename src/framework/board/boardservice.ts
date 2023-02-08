import { checkResponse } from "@cafienne/typescript-client";
import Config from "@cafienne/typescript-client/config";
import logger from "@cafienne/typescript-client/logger";
import CafienneService from "@cafienne/typescript-client/service/cafienneservice";
import User from "@cafienne/typescript-client/user";
import BoardRequestDetails from "./boardrequestdetails";
import TeamRequestDetails from "./teamrequestdetails";

/**
 * Connection to the /board APIs of Cafienne
 */
export default class BoardService {

    /**
     * Deletes the case on behalf of the user. User must be a tenant owner.
     * @param user
     * @param board 
     * @param expectedStatusCode 
     */
    static async createBoard(user: User, board: BoardRequestDetails, expectedStatusCode: number = 202, errorMsg = `CreateBoard is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Creating board ${board}`);
        const response = await CafienneService.post(`/board`, user, board);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async getBoard(user: User, boardid: string, expectedStatusCode: number = 200, errorMsg = `GetBoard ${boardid} is not expected to succeed for user ${user}`) {
        if (Config.PlatformService.log) logger.debug(`Getting board ${boardid}`);
        const response = await CafienneService.get(`/board/${boardid}`, user);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async getBoards(user: User, expectedStatusCode: number = 200, errorMsg = `GetBoards is not expected to succeed for user ${user}`) {
        if (Config.PlatformService.log) logger.debug(`Getting boards`);
        const response = await CafienneService.get(`/board`, user);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async addTeam(user: User, team: TeamRequestDetails, expectedStatusCode: number = 202, errorMsg = `AddTeam is not expected to succeed for user ${user} on board ${team.boardId}`) {
        if (Config.PlatformService.log) logger.debug(`Adding team on board ${team.boardId}`);
        const response = await CafienneService.post(`/board/${team.boardId}/team`, user, team.team);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async getTeamForBoard(user: User, boardId: string, expectedStatusCode: number = 200, errorMsg = `Get team on board ${boardId} did not succeed`) {
        if (Config.PlatformService.log) logger.debug(`Creating board ${boardId}`);
        const response = await CafienneService.get(`/board/${boardId}/team`, user);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

}
