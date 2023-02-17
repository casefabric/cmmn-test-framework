'use strict';

import TestCase from '@cafienne/typescript-client/test/testcase';
import BoardService from '../../../framework/board/boardservice';
import WorldWideTestTenant from '../../worldwidetesttenant';
import {getRawInput} from "readline-sync";
import ColumnDetails from '../../../framework/board/columndetails';
import BoardRequestDetails from '../../../framework/board/boardrequestdetails';
import { SomeTime } from '@cafienne/typescript-client';


const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;

export default class TestBoardAPI extends TestCase {
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

        console.log("Created board " + JSON.stringify(board, undefined, 2))

        // await SomeTime(5000)

        board.form = {
            schema: {
            },
            uiSchema: {
            }
        };
        board.title = "new title";
        await BoardService.updateBoard(user, board);

        const column: ColumnDetails = {
            title: 'FirstColumn',
            form: {
                "noSchema": null
            }
        }

        const firstColumn = await BoardService.addColumn(user, boardId, column);
        await SomeTime(1000)
        firstColumn.form = board.form;
        await BoardService.updateColumn(user, boardId, firstColumn);

        return;

        await BoardService.getBoard(user, boardId);

        await BoardService.getBoards(user);

        await BoardService.addTeam(user, {
            boardId: boardId,
            team: [{ subject: user.id, roles: ['BOARD_MANAGER', 'APPROVE']}]
        });

        await BoardService.getTeamForBoard(user, boardId);
    }
}
