import { checkJSONResponse, checkResponse } from "@cafienne/typescript-client";
import Config from "@cafienne/typescript-client/config";
import logger from "@cafienne/typescript-client/logger";
import User from "@cafienne/typescript-client/user";
import BoardFlowService from "./boardflowservice";
import BoardRequestDetails from "./boardrequestdetails";
import CafienneService from "./cafienneservice";
import ColumnDetails from "./columndetails";
import TeamRequestDetails, { TeamMember } from "./teamrequestdetails";

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
        return checkJSONResponse(response, errorMsg, expectedStatusCode).then(object => {
            board.id = object.boardId;
            return board;
        });
    }

    /**
     * Deletes the case on behalf of the user. User must be a tenant owner.
     * @param user
     * @param board 
     * @param expectedStatusCode 
     */
    static async updateBoard(user: User, board: BoardRequestDetails, expectedStatusCode: number = 202, errorMsg = `UpdateBoard is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Updating board ${board}`);
        const postMaterial = Object.assign({}, board);
        delete postMaterial.id;
        const response = await CafienneService.post(`/board/${board.id}`, user, postMaterial);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async addColumn(user: User, board: string | BoardRequestDetails, column: ColumnDetails, expectedStatusCode: number = 202, errorMsg = `AddColumn is not expected to succeed for user ${user} on board ${column}`): Promise<ColumnDetails> {
        if (Config.PlatformService.log) logger.debug(`Adding column ${column}`);

        const response = await CafienneService.post(`/board/${boardId(board)}/columns`, user, column);
        return checkJSONResponse(response, errorMsg, expectedStatusCode).then(object => {
            column.id = object.columnId;
            return column;
        });
    }

    static async updateColumn(user: User, board: string | BoardRequestDetails, column: ColumnDetails, expectedStatusCode: number = 202, errorMsg = `UpdateColumn is not expected to succeed for user ${user} on column ${column}`) {
        if (Config.PlatformService.log) logger.debug(`Updating column ${column.id}`);
        const postMaterial = Object.assign({}, column);
        delete postMaterial.id;
        const response = await CafienneService.post(`/board/${boardId(board)}/columns/${column.id}`, user, postMaterial);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async getBoard(user: User, boardid: string, expectedStatusCode: number = 200, errorMsg = `GetBoard ${boardid} is not expected to succeed for user ${user}`) {
        if (Config.PlatformService.log) logger.debug(`Getting board ${boardid}`);
        const response = await CafienneService.get(`/board/${boardid}`, user, undefined, BoardFlowService.BOARD_LAST_MODIFIED);
        return checkJSONResponse(response, errorMsg, expectedStatusCode);
    }

    static async getBoards(user: User, expectedStatusCode: number = 200, errorMsg = `GetBoards is not expected to succeed for user ${user}`) {
        if (Config.PlatformService.log) logger.debug(`Getting boards`);
        const response = await CafienneService.get(`/board`, user);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async addTeam(user: User, board: string | BoardRequestDetails, team: TeamRequestDetails, expectedStatusCode: number = 202, errorMsg = `AddTeam is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Adding team on board ${boardId(board)}`);
        const response = await CafienneService.post(`/board/${boardId(board)}/team`, user, team);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async addTeamMember(user: User, board: string | BoardRequestDetails, member: TeamMember, expectedStatusCode: number = 202, errorMsg = `addTeamMember is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Adding team member to board ${boardId(board)}`);
        const response = await CafienneService.post(`/board/${boardId(board)}/team/members`, user, member);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async replaceTeamMember(user: User, board: string | BoardRequestDetails, member: TeamMember, expectedStatusCode: number = 202, errorMsg = `replaceTeamMember is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Replacing team member to board ${boardId(board)}`);
        const response = await CafienneService.post(`/board/${boardId(board)}/team/members/${member}`, user, member);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async removeTeamMember(user: User, board: string | BoardRequestDetails, member: TeamMember|string, expectedStatusCode: number = 202, errorMsg = `removeTeamMember is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Removing team member to board ${boardId(board)}`);
        const response = await CafienneService.delete(`/board/${boardId(board)}/team/members/${member}`, user);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async addBoardRole(user: User, board: string | BoardRequestDetails, role: string, expectedStatusCode: number = 202, errorMsg = `addBoardRole is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Adding role ${role} to board ${boardId(board)}`);
        const response = await CafienneService.put(`/board/${boardId(board)}/team/roles/${role}`, user);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async removeBoardRole(user: User, board: string | BoardRequestDetails, role: string, expectedStatusCode: number = 202, errorMsg = `removeBoardRole is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Removing role ${role} to board ${boardId(board)}`);
        const response = await CafienneService.delete(`/board/${boardId(board)}/team/roles/${role}`, user);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async getTeamForBoard(user: User, boardId: string, expectedStatusCode: number = 200, errorMsg = `Get team on board ${boardId} did not succeed`) {
        if (Config.PlatformService.log) logger.debug(`Creating board ${boardId}`);
        const response = await CafienneService.get(`/board/${boardId}/team`, user);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

}

const boardId = (b: string|BoardRequestDetails): string => {
    if (typeof(b) === 'string') return b;
    else return b.id || '';
}