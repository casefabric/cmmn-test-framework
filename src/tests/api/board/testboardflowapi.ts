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


const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;

export default class TestBoardFlowAPI extends TestCase {
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

        const board = await BoardService.createBoard(user, new BoardDefinition("Board to Test Flow API", form));

        await boardPrinter(user, board, "Created board ");

        // await SomeTime(5000)

        const column: ColumnDefinition = new ColumnDefinition('FirstColumn', form);
        const column2: ColumnDefinition = new ColumnDefinition('SecondColumn');

        await BoardService.addColumn(user, board, column);

        await BoardService.addColumn(user, board, column2);

        const flow = await BoardFlowService.startFlow(user, board, { subject: 'MyFirstFlow', data: { input: "een getal"}});
        const flow2 = await BoardFlowService.startFlow(user, board, { subject: 'MySecondFlow', data: { somethingElse: false}});
        
        const taskInFirstColumn = await BoardService.getBoard(user, board).then(board => board.getFlowTask(flow.id));

        await BoardFlowService.claimFlowTask(user, board, taskInFirstColumn.flowId, taskInFirstColumn.id);
        const claimedTask = await BoardService.getBoard(user, board).then(board => board.getFlowTask(flow.id));
        if (claimedTask.claimedBy !== user.id) {
            throw new Error(`Expected to find '${user}' as the assignee of the task, but found '${claimedTask.claimedBy}'`);
        }
        
        const changedSubject = 'MyFirstFlowWithChangedSubject';
        const changedData = { input: "een ander getal"};
        await BoardFlowService.saveFlowTask(user, board, taskInFirstColumn.flowId, taskInFirstColumn.id, changedSubject, changedData);
        const savedTask = await BoardService.getBoard(user, board).then(board => board.getFlowTask(flow.id));
        if (savedTask.subject !== changedSubject) {
            throw new Error(`Expected to find '${changedSubject}' as the subject of the task, but found '${savedTask.subject}'`);
        }
        if (! Comparison.sameJSON(changedData, savedTask.data)) {
            console.log(`Expecting task data ${JSON.stringify(changedData, undefined, 2)}\nFound task data ${JSON.stringify(savedTask.data, undefined, 2)}`);
            throw new Error('Saving task data did not lead to the expected result (see logs above)');
        }

        await BoardFlowService.completeFlowTask(user, board, taskInFirstColumn.flowId, taskInFirstColumn.id, "MyFirstFlowWithOriginalSubject", { input: "een getal"});

        const taskInSecondColumn = await BoardService.getBoard(user, board).then(board => board.getFlowTask(flow.id));

        await BoardFlowService.completeFlowTask(user, board, taskInSecondColumn.flowId, taskInSecondColumn.id, "MyFirstFlow", { input: "Completing the first flow!"});

        await BoardService.getBoard(user, board);

        const taskNoLongerAvailable = await BoardService.getBoard(user, board).then(board => board.getFlowTask(flow.id));
        if (taskNoLongerAvailable) {
            // It is available?!
            throw new Error("Did not expect the task to be available after it went through all columns of the board");
        }

        await boardPrinter(user, board);

        console.log("\nBoard ID: " + board.id)
        console.log("\nFlow1: " + flow.id)
        console.log("Flow2: " + flow2.id)
    }
}
