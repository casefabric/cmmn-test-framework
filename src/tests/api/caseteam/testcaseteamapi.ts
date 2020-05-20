'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import CaseFileService from '../../../framework/service/case/casefileservice';
import CaseTeamMember from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import { ServerSideProcessing } from '../../../framework/test/time';
import Comparison from '../../../framework/test/comparison';

const repositoryService = new RepositoryService();
const definition = 'helloworld.xml';

const caseService = new CaseService();
const caseTeamService = new CaseTeamService();
const caseFileService = new CaseFileService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const employee = worldwideTenant.employee;

export default class TestCaseTeamAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, sender, tenant);
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: sender.id
            }
        };
        const caseTeam = {
            members: [{
                user: sender.id,
                roles: ["ADMIN"]
            }, {
                user: receiver.id,
                roles: []
            }]
        }
        const startCase = { tenant, definition, inputs, debug: true, caseTeam };

        const caseInstance = await caseService.startCase(startCase, sender);

        // Getting the case must be allowed for both sender and receiver
        await caseService.getCase(caseInstance, sender);
        await caseService.getCase(caseInstance, receiver);
        // Getting the case is not allow for the employee, as he is not part of the case team
        await caseService.getCase(caseInstance, employee, false);

        // After removing receiver, he should not longer have access.
        await caseTeamService.removeMember(caseInstance, sender, receiver);

        // Getting the case is no longer allowed for receiver
        // Getting the case is still allowed for sender
        await caseService.getCase(caseInstance, receiver, false);
        await caseService.getCase(caseInstance, sender);

        // Fetch case team. Should not be allowed for receiver, but should work for sender.
        await caseTeamService.getCaseTeam(caseInstance, receiver, false);
        const team = await caseTeamService.getCaseTeam(caseInstance, sender);
        console.log("\n\nTeam: " + team.members.length)

        
        // Getting the case file is allowed for sender, as he is part of the team
        await caseFileService.getCaseFile(caseInstance, sender, true);
        // Getting the case file is not allowed for receiver, as he is no longer part of the team
        await caseFileService.getCaseFile(caseInstance, receiver, false);

        // Add employee to the team, and show that he now has access to the case
        const newMember = new CaseTeamMember(employee);
        await caseTeamService.setMember(caseInstance, sender, newMember);
        await caseService.getCase(caseInstance, employee);

        // Replace entire case team; removes sender and adds receiver and employee
        const newTeam = new CaseTeam([new CaseTeamMember(receiver, ["ADMIN"]), new CaseTeamMember(employee)]);
        await caseTeamService.setCaseTeam(caseInstance, sender, newTeam);

        // So now sender no longer has access, but the others do.
        await caseService.getCase(caseInstance, employee);
        await caseService.getCase(caseInstance, receiver);
        await caseService.getCase(caseInstance, sender, false);

        // Finally we will compare the case team with both what the case thinks it is and what the case team thinks it is
        const newCase = await caseService.getCase(caseInstance, employee);
        Comparison.sameJSON(newTeam, newCase.team);

        const actualCaseTeam = await caseTeamService.getCaseTeam(caseInstance, employee);
        Comparison.sameJSON(actualCaseTeam, newTeam);
    }
}