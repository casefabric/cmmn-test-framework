'use strict';

import TestCase from '@cafienne/typescript-client/test/testcase';
import BoardDefinition from '../../../framework/board/boarddefinition';
import BoardService from '../../../framework/board/boardservice';
import { TeamMember } from '../../../framework/board/boardteam';
import WorldWideTestTenant from '../../worldwidetesttenant';
import { boardPrinter } from './testboardapi';


const worldwideTenant = new WorldWideTestTenant();
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestBoardTeamAPI extends TestCase {
    isDefaultTest: boolean = false;
    async onPrepareTest() {
        await worldwideTenant.create();
    }

    async run() {
        const roleBoardManager = 'BOARD_MANAGER';
        const roleApprove = 'APPROVE';
        const roleUnassigned = 'UnassignedRole';

        const guid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const boardId = `board_${guid}`;

        const board = await BoardService.createBoard(sender, new BoardDefinition("title", undefined, boardId));
        // console.log("Created board " + JSON.stringify(board, undefined, 2))
        await BoardService.getBoard(sender, board).then(board => {
            if (board.team.roles.length) {
                throw new Error(`Expected board to have no roles, but found some`);
            }
        });

        await BoardService.addBoardRole(sender, board, roleBoardManager);
        await BoardService.addBoardRole(sender, board, roleApprove);
        await BoardService.getBoard(sender, board).then(board => {
            if (board.team.roles.length !== 2) {
                throw new Error(`Expected board to have 2 roles, but found ${board.team.roles.length}`);
            }
        });


        await BoardService.removeBoardRole(sender, board, roleBoardManager);
        await BoardService.getBoard(sender, board).then(board => {
            if (board.team.roles.includes(roleBoardManager)) {
                throw new Error(`Expected role board manager to be removed, but it is still present`);
            }
        });

        await BoardService.addBoardRole(sender, board, roleBoardManager);
        await BoardService.addBoardRole(sender, board, roleUnassigned);

        await boardPrinter(sender, board);

        // Receiver should not have access to the board before being added to the team
        await BoardService.getBoard(receiver, board, 404);

        const member = new TeamMember(receiver, [roleBoardManager, roleApprove]);

        await BoardService.addTeamMember(sender, board, member);

        // Receiver now should have access to the board
        await BoardService.getBoard(receiver, board);

        await BoardService.getBoard(sender, board);

        member.roles = [roleApprove];
        await BoardService.replaceTeamMember(sender, board, member);
        await BoardService.getBoard(sender, board).then(board => {
            const member = board.team.members.find(m => m.userId === receiver.userId);
            if (!member) {
                throw new Error(`Expected user ${receiver} to be a member of the board team`);
            }
            if (member.roles.length !== 1) {
                throw new Error(`Expected user ${receiver} to have 1 role, but found ${member.roles.length} roles instead.`);
            }
            if (member.roles[0] !== roleApprove) {
                throw new Error(`Expected user ${receiver} to have role '${roleApprove}', but found role '${member.roles[0]}' instead.`);
            }
        });

        await BoardService.removeTeamMember(sender, board, member);

        await BoardService.getBoard(sender, board).then(board => {
            const member = board.team.members.find(m => m.userId === receiver.userId);
            if (member) {
                throw new Error(`Expected user ${receiver} to be removed from the board team`);
            }
        });

        // And, if no longer member, receiver should no longer have access to the board
        await BoardService.getBoard(receiver, board, 404);

        console.log("\nFinished test on BoardAPI - Board: " + board)
    }
}
