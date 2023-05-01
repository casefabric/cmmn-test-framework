'use strict';

import { SomeTime } from '@cafienne/typescript-client';
import Comparison from '@cafienne/typescript-client/test/comparison';
import TestCase from '@cafienne/typescript-client/test/testcase';
import BoardDefinition from '../../../framework/board/boarddefinition';
import BoardFlowService from '../../../framework/board/boardflowservice';
import BoardService from '../../../framework/board/boardservice';
import ColumnDefinition from '../../../framework/board/columndefinition';
import WorldWideTestTenant from '../../worldwidetesttenant';
import { boardPrinter } from './testboardapi';
import { TeamMember } from '../../../framework/board/boardteam';


const worldwideTenant = new WorldWideTestTenant();
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestBoardFlowUpdateDefinition extends TestCase {
    isDefaultTest: boolean = false;
    async onPrepareTest() {
        await worldwideTenant.create();
    }

    async run() {
        const form = {
            schema: {
            },
            uiSchema: {
            }
        };

        const board = await BoardService.createBoard(sender, new BoardDefinition("Board to Test Flow API", form));
        const firstColumn: ColumnDefinition = await BoardService.addColumn(sender, board, new ColumnDefinition('FirstColumn', form));
        const secondColumn: ColumnDefinition = await BoardService.addColumn(sender, board, new ColumnDefinition('SecondColumn'));

        const firstFlow = await BoardFlowService.startFlow(sender, board, { subject: 'MyFirstFlow', data: { input: "een getal" } });
        const secondFlow = await BoardFlowService.startFlow(sender, board, { subject: 'MySecondFlow', data: { somethingElse: false } });

        const taskInFirstColumn = await BoardService.getBoard(sender, board).then(board => board.getFlowTask(firstFlow.id));
        await BoardFlowService.completeFlowTask(sender, board, taskInFirstColumn.flowId, taskInFirstColumn.id, "MyFirstFlowWithOriginalSubject", { input: "een getal" });
        const taskInSecondColumn = await BoardService.getBoard(sender, board).then(board => board.getFlowTask(firstFlow.id));

        firstColumn.title = "UpdatedFirstColumn";
        await BoardService.updateColumn(sender, board, firstColumn);

        await BoardService.getBoard(sender, board).then(board => {
            if (board.columns[0].title !== firstColumn.title) {
                throw new Error(`Expected first column in board to have title '${firstColumn.title}', but found title '${board.columns[0].title}' instead`);
            }
        });

        secondColumn.role = "NewBoardRole";
        await BoardService.updateColumn(sender, board, secondColumn);

        await BoardService.getBoard(sender, board).then(board => {
            if (board.columns[1].role !== secondColumn.role) {
                throw new Error(`Expected second column in board to have role '${secondColumn.role}', but found title '${board.columns[1].role}' instead`);
            }
        });

        await BoardService.addTeamMember(sender, board, new TeamMember(receiver));
        await BoardService.getBoard(receiver, board);

        // Should not be allowed, as receiver does not have the proper role
        await BoardFlowService.claimFlowTask(receiver, board, firstFlow, taskInSecondColumn, 401);

        secondColumn.role = "";
        await BoardService.updateColumn(sender, board, secondColumn);

        // await BoardService.replaceTeamMember(sender, board, new TeamMember(receiver, [secondColumn.role]));

        // Should now be allowed, as receiver now has the proper role
        await BoardFlowService.claimFlowTask(receiver, board, firstFlow, taskInSecondColumn);

        await BoardService.updateColumn(sender, board, secondColumn);

        // await boardPrinter(sender, board);

        console.log("\nBoard ID: " + board.id)
        console.log("\nFlow1: " + firstFlow.id)
        console.log("Flow2: " + secondFlow.id)
    }
}
