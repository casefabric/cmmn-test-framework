'use strict';

import TestCase from '@cafienne/typescript-client/test/testcase';
import User from '@cafienne/typescript-client/user';
import BoardDefinition from '../../../framework/board/boarddefinition';
import BoardService from '../../../framework/board/boardservice';
import { TeamMember } from '../../../framework/board/boardteam';
import ColumnDefinition from '../../../framework/board/columndefinition';
import WorldWideTestTenant from '../../worldwidetesttenant';


const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export const boardPrinter = async (user: User, board: BoardDefinition|string, prefix: string = "Board: ") => {
    await BoardService.getBoard(user, board).then(board => {
        console.log(`${prefix}${JSON.stringify(board, undefined, 2)}`);
    })
}

export default class TestBoardAPI extends TestCase {
    isDefaultTest: boolean = false;
    async onPrepareTest() {
        await worldwideTenant.create();
    }

    async run() {
        const guid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const boardId = `board_${guid}`;
 
        const board = await BoardService.createBoard(user, new BoardDefinition("title", undefined, boardId));

        await boardPrinter(user, board, 'Created board ');

        board.form = {
            schema: {
            },
            uiSchema: {
            }
        };
        board.title = "new title";
        await BoardService.updateBoard(user, board);

        const column: ColumnDefinition = new ColumnDefinition('FirstColumn', { "noSchema": null });        
        const firstColumn = await BoardService.addColumn(user, boardId, column);

        firstColumn.form = board.form;
        await BoardService.updateColumn(user, boardId, firstColumn);

        await BoardService.getBoard(user, boardId);

        // await BoardService.getBoards(user);

        
        await BoardService.addBoardRole(user, board, 'BOARD_MANAGER');
        await BoardService.addBoardRole(user, board, 'APPROVE');
        const member = new TeamMember(receiver, ['BOARD_MANAGER', 'APPROVE']);

        await BoardService.addTeamMember(user, board, member);

        await BoardService.getBoard(user, boardId);

        console.log("\nFinished test on BoardAPI - Board id is " + board.id)
    }
}
