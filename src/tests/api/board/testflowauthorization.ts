'use strict';

import { SomeTime } from '@cafienne/typescript-client';
import Comparison from '@cafienne/typescript-client/test/comparison';
import TestCase from '@cafienne/typescript-client/test/testcase';
import BoardDefinition from '../../../framework/board/boarddefinition';
import BoardFlowService from '../../../framework/board/boardflowservice';
import BoardService from '../../../framework/board/boardservice';
import { TeamMember } from '../../../framework/board/boardteam';
import ColumnDefinition from '../../../framework/board/columndefinition';
import WorldWideTestTenant from '../../worldwidetesttenant';
import { boardPrinter } from './testboardapi';


const worldwideTenant = new WorldWideTestTenant();
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const employee = worldwideTenant.employee;
const roleRequest = 'REQUEST';
const roleApprove = 'APPROVE';
const roleUnassigned = 'UnassignedRole';

export default class TestFlowAuthorization extends TestCase {
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
        await BoardService.addBoardRole(sender, board, roleRequest);
        await BoardService.addBoardRole(sender, board, roleUnassigned);

        console.log("Created board " + JSON.stringify(board, undefined, 2))

        const column: ColumnDefinition = new ColumnDefinition('FirstColumn', form, roleRequest);
        const column2: ColumnDefinition = new ColumnDefinition('SecondColumn', undefined, roleApprove);
        const column3: ColumnDefinition = new ColumnDefinition('ThirdColumn');

        await BoardService.addColumn(sender, board, column);
        await BoardService.addColumn(sender, board, column2);
        await BoardService.addColumn(sender, board, column3);

        await BoardService.getBoard(sender, board).then(board => {
            const columns = board.columns;
            if (columns.length != 3) {
                throw new Error('Expected board to have 3 columns');
            }
            if (columns[0].role !== roleRequest) {
                throw new Error(`Expecting first column to have role ${roleRequest}, but found ${columns[0].role}`);
            }
            if (board.team.roles.length !== 3) {
                throw new Error('Expected board to have 3 roles');                
            }
            if (! board.team.roles.find(role => role === roleApprove)) {
                throw new Error(`Expected board to have role ${roleApprove}`);                
            }
        });
        const flow = await BoardFlowService.startFlow(sender, board, { subject: 'MyFirstFlow', data: { input: "een getal"}});
        
        const taskInFirstColumn = await BoardService.getBoard(sender, board).then(board => board.getFlowTask(flow.id));
// return;
        await BoardFlowService.claimFlowTask(receiver, board, taskInFirstColumn.flowId, taskInFirstColumn.id, 404);

        // await SomeTime(5000)
        await BoardService.addTeamMember(sender, board, new TeamMember(receiver, [roleRequest]));
        await BoardService.addTeamMember(sender, board, new TeamMember(employee, [roleApprove]));

        await BoardFlowService.startFlow(receiver, board, { subject: 'Receiver flow', data: { input: true}}).then(flow => {
            console.log("BEM, created flow " + flow.id)
        });

        // return;

        await BoardService.getBoard(receiver, board).then(board => board.getFlowTask(flow.id));

        // Employee does not have the role BOARD_MANAGER
        await BoardFlowService.claimFlowTask(employee, board, taskInFirstColumn.flowId, taskInFirstColumn.id, 401);

        // Also sender does not have the role BOARD_MANAGER, but sender is the owner of the board.
        await BoardFlowService.claimFlowTask(sender, board, taskInFirstColumn.flowId, taskInFirstColumn.id);

        console.log("Task: " + taskInFirstColumn)

        // Receiver should not be able to claim the task
        await BoardFlowService.claimFlowTask(receiver, board, taskInFirstColumn.flowId, taskInFirstColumn.id, 400);

        const claimedTask = await BoardService.getBoard(sender, board).then(board => board.getFlowTask(flow.id));
        if (claimedTask.claimedBy !== sender.id) {
            throw new Error(`Expected to find '${sender}' as the assignee of the task, but found '${claimedTask.claimedBy}'`);
        }
// return;
        
        const changedSubject = 'MyFirstFlowWithChangedSubject';
        const changedData = { input: "een ander getal"};
        await BoardFlowService.saveFlowTask(sender, board, taskInFirstColumn.flowId, taskInFirstColumn.id, changedSubject, changedData);
        const savedTask = await BoardService.getBoard(sender, board).then(board => board.getFlowTask(flow.id));
        if (savedTask.subject !== changedSubject) {
            throw new Error(`Expected to find '${changedSubject}' as the subject of the task, but found '${savedTask.subject}'`);
        }
        if (! Comparison.sameJSON(changedData, savedTask.data)) {
            console.log(`Expecting task data ${JSON.stringify(changedData, undefined, 2)}\nFound task data ${JSON.stringify(savedTask.data, undefined, 2)}`);
            throw new Error('Saving task data did not lead to the expected result (see logs above)');
        }

        await BoardFlowService.completeFlowTask(sender, board, taskInFirstColumn.flowId, taskInFirstColumn.id, "MyFirstFlowWithOriginalSubject", { input: "een getal"});

        const taskInSecondColumn = await BoardService.getBoard(sender, board).then(board => board.getFlowTask(flow.id));

        await BoardFlowService.completeFlowTask(receiver, board, taskInSecondColumn.flowId, taskInSecondColumn.id, "MyFirstFlow", { input: "Completing the second column!"}, 401);

        // Remove the Approval role from the employee, then employee should not be able to complete the task
        await BoardService.replaceTeamMember(sender, board, new TeamMember(employee, []));
        await BoardFlowService.completeFlowTask(employee, board, taskInSecondColumn.flowId, taskInSecondColumn.id, "MyFirstFlow", { input: "Completing the second column!"}, 401);

        await BoardService.replaceTeamMember(sender, board, new TeamMember(employee, [roleApprove]));
        await BoardFlowService.completeFlowTask(employee, board, taskInSecondColumn.flowId, taskInSecondColumn.id, "MyFirstFlow", { input: "Completing the second column!"});

        await BoardService.getBoard(sender, board);

        const taskInThirdColumn = await BoardService.getBoard(sender, board).then(board => board.getFlowTask(flow.id));
        // Third task does not need a role, just membership. Again remove the roles from Employee, and check whether employee can complete third column.
        await BoardService.replaceTeamMember(sender, board, new TeamMember(employee, []));
        await BoardFlowService.completeFlowTask(employee, board, taskInThirdColumn.flowId, taskInThirdColumn.id, "MyFirstFlow", { input: "Completing the first flow!"});

        const taskNoLongerAvailable = await BoardService.getBoard(sender, board).then(board => board.getFlowTask(flow.id));
        if (taskNoLongerAvailable) {
            // It is available?!
            throw new Error("Did not expect the task to be available after it went through all columns of the board");
        }

        await boardPrinter(sender, board);

        console.log("\nBoard ID: " + board.id)
        console.log("\nFlow1: " + flow.id)
    }
}
