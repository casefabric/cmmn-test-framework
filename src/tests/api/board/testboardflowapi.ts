'use strict';

import TestCase from '@cafienne/typescript-client/test/testcase';
import BoardDefinition from '../../../framework/board/boarddefinition';
import BoardFlowService from '../../../framework/board/boardflowservice';
import BoardService from '../../../framework/board/boardservice';
import ColumnDefinition from '../../../framework/board/columndefinition';
import WorldWideTestTenant from '../../worldwidetesttenant';


const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;

export default class TestBoardFlowAPI extends TestCase {
    isDefaultTest: boolean = false;
    async onPrepareTest() {
        await worldwideTenant.create();
    }

    async run() {
        const board = await BoardService.createBoard(user, new BoardDefinition("Board to Test Flow API"));

        console.log("Created board " + JSON.stringify(board, undefined, 2))

        // await SomeTime(5000)

        const column: ColumnDefinition = new ColumnDefinition('FirstColumn', board.form);
        const column2: ColumnDefinition = new ColumnDefinition('SecondColumn');

        await BoardService.addColumn(user, board, column);

        await BoardService.addColumn(user, board, column2);

        const flow = await BoardFlowService.startFlow(user, board, { subject: 'MyFirstFlow', data: { input: "een getal"}});
        const flow2 = await BoardFlowService.startFlow(user, board, { subject: 'MySecondFlow', data: { somethingElse: false}});
        
        const taskInFirstColumn = await BoardService.getBoard(user, board).then(board => board.getFlowTask(flow.id));

        await BoardFlowService.claimFlowTask(user, board, taskInFirstColumn.flowId, taskInFirstColumn.id);
        await BoardService.getBoard(user, board);
        await BoardFlowService.saveFlowTask(user, board, taskInFirstColumn.flowId, taskInFirstColumn.id, "MyFirstFlowWithChangedSubject", { input: "een ander getal"});
        await BoardFlowService.completeFlowTask(user, board, taskInFirstColumn.flowId, taskInFirstColumn.id, "MyFirstFlowWithOriginalSubject", { input: "een getal"});

        const taskInSecondColumn = await BoardService.getBoard(user, board).then(board => board.getFlowTask(flow.id));

        await BoardFlowService.completeFlowTask(user, board, taskInSecondColumn.flowId, taskInSecondColumn.id, "MyFirstFlow", { input: "Completing the first flow!"});

        await BoardService.getBoard(user, board);

        const taskNoLongerAvailable = await BoardService.getBoard(user, board).then(board => board.getFlowTask(flow.id));
        if (taskNoLongerAvailable) {
            // It is available?!
            throw new Error("Did not expect the task to be available after it went through all columns of the board");
        }

        console.log("\nBoard ID: " + board.id)
        console.log("\nFlow1: " + flow.id)
        console.log("Flow2: " + flow2.id)
    }
}
