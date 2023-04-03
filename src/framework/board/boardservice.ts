import { checkJSONResponse, checkResponse } from "@cafienne/typescript-client";
import Config from "@cafienne/typescript-client/config";
import logger from "@cafienne/typescript-client/logger";
import User from "@cafienne/typescript-client/user";
import BoardFlowService from "./boardflowservice";
import BoardDefinition from "./boarddefinition";
import CafienneService from "./cafienneservice";
import ColumnDefinition from "./columndefinition";
import BoardTeam, { TeamMember } from "./boardteam";

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
    static async createBoard(user: User, board: BoardDefinition, expectedStatusCode: number = 202, errorMsg = `CreateBoard is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Creating board ${board}`);
        const response = await CafienneService.post(`/boards`, user, board.toJson());
        return checkJSONResponse(response, errorMsg, expectedStatusCode).then(object => {
            if (object.boardId) { // Only copy id upon successful responses, and avoid deleting the current id on failures
                board.id = object.boardId;
            }
            return board;
        });
    }

    static async getBoard(user: User, board: string | BoardDefinition, expectedStatusCode: number = 200, errorMsg = `GetBoard ${board} is not expected to succeed for user ${user}`): Promise<BoardDefinition> {
        if (Config.PlatformService.log) logger.debug(`Getting board ${board}`);
        const response = await CafienneService.get(`/boards/${board}`, user, undefined);
        return checkJSONResponse(response, errorMsg, expectedStatusCode, BoardDefinition);
    }

    /**
     * Deletes the case on behalf of the user. User must be a tenant owner.
     * @param user
     * @param board 
     * @param expectedStatusCode 
     */
    static async updateBoard(user: User, board: BoardDefinition, expectedStatusCode: number = 202, errorMsg = `UpdateBoard is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Updating board ${board}`);
        const postMaterial = Object.assign({}, board.toJson());
        delete postMaterial.id;
        const response = await CafienneService.post(`/boards/${board.id}`, user, postMaterial);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async addColumn(user: User, board: string | BoardDefinition, column: ColumnDefinition, expectedStatusCode: number = 202, errorMsg = `AddColumn is not expected to succeed for user ${user} on board ${column}`): Promise<ColumnDefinition> {
        if (Config.PlatformService.log) logger.debug(`Adding column ${column}`);

        const response = await CafienneService.post(`/boards/${board}/columns`, user, column.toJson());
        return checkJSONResponse(response, errorMsg, expectedStatusCode, ColumnDefinition).then(object => {
            if (object.columnId) { // Only copy id upon successful responses, and avoid deleting the current id on failures
                column.id = object.columnId;
            }
            return column;
        });
    }

    static async updateColumn(user: User, board: string | BoardDefinition, column: ColumnDefinition, expectedStatusCode: number = 202, errorMsg = `UpdateColumn is not expected to succeed for user ${user} on column ${column}`) {
        if (Config.PlatformService.log) logger.debug(`Updating column ${column}`);
        const postMaterial = Object.assign({}, column.toJson());
        delete postMaterial.id;
        const response = await CafienneService.post(`/boards/${board}/columns/${column}`, user, postMaterial);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async removeColumn(user: User, board: string | BoardDefinition, column: ColumnDefinition|string, expectedStatusCode: number = 202, errorMsg = `RemoveColumn is not expected to succeed for user ${user} on column ${column}`) {
        if (Config.PlatformService.log) logger.debug(`Removing column ${column}`);
        const response = await CafienneService.delete(`/boards/${board}/columns/${column}`, user);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async getBoards(user: User, expectedStatusCode: number = 200, errorMsg = `GetBoards is not expected to succeed for user ${user}`): Promise<Array<BoardDefinition>>    {
        if (Config.PlatformService.log) logger.debug(`Getting boards`);
        const response = await CafienneService.get(`/boards`, user);
        return checkJSONResponse(response, errorMsg, expectedStatusCode, [BoardDefinition]);
    }

    static async addTeamMember(user: User, board: string | BoardDefinition, member: TeamMember, expectedStatusCode: number = 202, errorMsg = `addTeamMember is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Adding team member to board ${board}`);
        const response = await CafienneService.post(`/boards/${board}/team/members`, user, member);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async replaceTeamMember(user: User, board: string | BoardDefinition, member: TeamMember, expectedStatusCode: number = 202, errorMsg = `replaceTeamMember is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Replacing team member to board ${board}`);
        const postMaterial: any = Object.assign({}, member);
        delete postMaterial.userId;
        const response = await CafienneService.post(`/boards/${board}/team/members/${member}`, user, postMaterial);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async removeTeamMember(user: User, board: string | BoardDefinition, member: TeamMember|string, expectedStatusCode: number = 202, errorMsg = `removeTeamMember is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Removing team member to board ${board}`);
        const response = await CafienneService.delete(`/boards/${board}/team/members/${member}`, user);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async addBoardRole(user: User, board: string | BoardDefinition, role: string, expectedStatusCode: number = 202, errorMsg = `addBoardRole is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Adding role ${role} to board ${board}`);
        const response = await CafienneService.put(`/boards/${board}/team/roles/${role}`, user);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    static async removeBoardRole(user: User, board: string | BoardDefinition, role: string, expectedStatusCode: number = 202, errorMsg = `removeBoardRole is not expected to succeed for user ${user} on board ${board}`) {
        if (Config.PlatformService.log) logger.debug(`Removing role ${role} to board ${boardId(board)}`);
        const response = await CafienneService.delete(`/boards/${boardId(board)}/team/roles/${role}`, user);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }
}

const boardId = (b: string|BoardDefinition): string => {
    if (typeof(b) === 'string') return b;
    else return b.id || '';
}