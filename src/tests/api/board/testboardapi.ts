'use strict';

import Comparison from '@cafienne/typescript-client/test/comparison';
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
const roleRequest = 'REQUEST';
const roleApprove = 'APPROVE';
const roleUnassigned = 'UnassignedRole';

export const boardPrinter = async (user: User, board: BoardDefinition | string, prefix: string = "Board: ") => {
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

        // Add a first columns
        const firstColumnTitle = 'FirstColumn';
        const firstColumnForm = {
            "noSchema": null
        }
        const column = await BoardService.addColumn(user, boardId, new ColumnDefinition(firstColumnTitle, firstColumnForm));

        // Validate that the new column is found, with the expected values.
        await BoardService.getBoard(user, boardId).then(board => {
            if (board.columns.length !== 1) {
                throw new Error(`Expected to find 1 column in the board but found ${board.columns.length} instead`);
            }
            const firstColumn = board.columns[0];
            if (firstColumn.title !== firstColumnTitle) {
                throw new Error(`Expected the first column to have title '${firstColumnTitle}' but found ${firstColumn.title}`)
            }
            if (!Comparison.sameJSON(firstColumnForm, firstColumn.form)) {
                console.log(`Expecting first column form as ${JSON.stringify(firstColumnForm, undefined, 2)}\nFound first column form to be ${JSON.stringify(firstColumn.form, undefined, 2)}`);
                throw new Error('Setting form of first column did not lead to the expected result (see logs above)');
            }
        });

        // Adding the column again should result in 400 BadRequest
        await BoardService.addColumn(user, board, column, 400);

        // Add 3 more columns, and then remove 1
        const column2 = await BoardService.addColumn(user, board, new ColumnDefinition("column2"));
        const column3 = await BoardService.addColumn(user, board, new ColumnDefinition("column3"));
        const column4 = await BoardService.addColumn(user, board, new ColumnDefinition("column4"));
        await assertColumnCount(user, board, 4);
        await BoardService.removeColumn(user, board, column2);
        await assertColumnCount(user, board, 3);
        await BoardService.removeColumn(user, board, column4);
        await assertColumnCount(user, board, 2);
        await BoardService.removeColumn(user, board, column3);
        await assertColumnCount(user, board, 1);

        // Update the form
        column.form = board.form;
        column.role = roleRequest;
        await BoardService.updateColumn(user, boardId, column);
        // Validate the form update
        await BoardService.getBoard(user, boardId).then(board => {
            if (board.columns.length !== 1) {
                throw new Error(`Expected to find 1 column in the board but found ${board.columns.length} instead`);
            }
            const firstColumn = board.columns[0];
            const expectedForm = board.form;
            if (!Comparison.sameJSON(expectedForm, firstColumn.form)) {
                console.log(`Expecting first column form as ${JSON.stringify(expectedForm, undefined, 2)}\nFound first column form to be ${JSON.stringify(firstColumn.form, undefined, 2)}`);
                throw new Error('Setting form of first column did not lead to the expected result (see logs above)');
            }

            if (firstColumn.role !== roleRequest) {
                throw new Error(`Expected`)
            }
        });

        // await BoardService.getBoards(user);

        await BoardService.addBoardRole(user, board, roleRequest);
        await BoardService.addBoardRole(user, board, roleApprove);
        const member = new TeamMember(receiver, [roleRequest, roleApprove]);

        await BoardService.addTeamMember(user, board, member);

        await BoardService.getBoard(user, boardId);

        console.log("\nFinished test on BoardAPI - Board id is " + board.id)
    }
}

export async function assertColumnCount(user: User, board: BoardDefinition|string, expectedCount: number): Promise<BoardDefinition> {
    return BoardService.getBoard(user, board).then(board => {
        if (board.columns.length != expectedCount) {
            throw new Error(`Expecting board to have ${expectedCount} columns, but found ${board.columns.length} instead`);
        }
        return board;
    })
}
