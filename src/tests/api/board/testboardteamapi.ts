'use strict';

import TestCase from '@cafienne/typescript-client/test/testcase';
import BoardDefinition from '../../../framework/board/boarddefinition';
import BoardService from '../../../framework/board/boardservice';
import { TeamMember } from '../../../framework/board/boardteam';
import WorldWideTestTenant from '../../worldwidetesttenant';


const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestBoardTeamAPI extends TestCase {
    isDefaultTest: boolean = false;
    async onPrepareTest() {
        await worldwideTenant.create();
    }

    async run() {
        const guid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const boardId = `board_${guid}`;

        const board = await BoardService.createBoard(user, new BoardDefinition("title", undefined, boardId));
        // console.log("Created board " + JSON.stringify(board, undefined, 2))

        await BoardService.addBoardRole(user, board, 'BOARD_MANAGER');
        await BoardService.addBoardRole(user, board, 'APPROVE');

        await BoardService.removeBoardRole(user, board, 'BOARD_MANAGER');
        await BoardService.addBoardRole(user, board, 'BOARD_MANAGER');
        await BoardService.addBoardRole(user, board, 'UnassignedRole');

        console.log("\nCreated board " + board.id)

        const member = new TeamMember(receiver, ['BOARD_MANAGER', 'APPROVE']);

        await BoardService.addTeamMember(user, board, member);
        await BoardService.getBoard(user, boardId);

        await BoardService.removeTeamMember(user, board, member);
        await BoardService.getBoard(user, boardId);

        console.log("\nFinished test on BoardAPI - Board id is " + board.id)
    }
}
