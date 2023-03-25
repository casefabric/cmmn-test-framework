'use strict';

import TestCase from '@cafienne/typescript-client/test/testcase';
import BoardService from '../../../framework/board/boardservice';
import WorldWideTestTenant from '../../worldwidetesttenant';


const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;

export default class TestBoardTeamAPI extends TestCase {
    isDefaultTest: boolean = false;
    async onPrepareTest() {
        await worldwideTenant.create();
    }

    async run() {
        const guid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const boardId = `board-${guid}`;

        const board = await BoardService.createBoard(user, {
            title: "title",
            id: boardId
        })
        // console.log("Created board " + JSON.stringify(board, undefined, 2))

        await BoardService.addBoardRole(user, board, 'BOARD_MANAGER');
        await BoardService.addBoardRole(user, board, 'APPROVE');

        await BoardService.removeBoardRole(user, board, 'BOARD_MANAGER');
        await BoardService.addBoardRole(user, board, 'BOARD_MANAGER');

        console.log("\nCreated board " + board.id)

        await BoardService.addTeamMember(user, board, {
            userId: "receiver",
            name: '',
            roles: ['BOARD_MANAGER', 'APPROVE']
        })

        await BoardService.getBoard(user, boardId);

        await BoardService.getTeamForBoard(user, boardId);
    }
}
