'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import CaseFileService from '../../../framework/service/case/casefileservice';
import CaseTeamMember from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import Comparison from '../../../framework/test/comparison';

const repositoryService = new RepositoryService();
const definition = 'caseteam.xml';

const caseService = new CaseService();
const caseTeamService = new CaseTeamService();
const caseFileService = new CaseFileService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const employee = worldwideTenant.employee;

const requestorRole = "Requestor";
const approverRole = "Approver";
const paRole = "PersonalAssistant";
const notExistingRole = "ThisRoleIsNotInTheCaseDefinition";
const emptyRole = "";

export default class TestCaseTeamAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, sender, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([
            new CaseTeamMember(sender, [requestorRole]),
            new CaseTeamMember(receiver, [approverRole, paRole])
        ]);
        const startCase = { tenant, definition, debug: true, caseTeam };

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

        // Removing someone that is not part of the team should fail
        await caseTeamService.removeMember(caseInstance, sender, employee, false);

        // Fetch case team. Should not be allowed for receiver, but should work for sender.
        await caseTeamService.getCaseTeam(caseInstance, receiver, false);
        const team = await caseTeamService.getCaseTeam(caseInstance, sender);
        console.log("\n\nTeam size: " + team.members.length)

        
        // Getting the case file is allowed for sender, as he is part of the team
        await caseFileService.getCaseFile(caseInstance, sender, true);
        // Getting the case file is not allowed for receiver, as he is no longer part of the team
        await caseFileService.getCaseFile(caseInstance, receiver, false);

        // Add employee to the team, and show that he now has access to the case
        await caseTeamService.setMember(caseInstance, sender, new CaseTeamMember(employee));
        // Now employee should be able to get the case
        await caseService.getCase(caseInstance, employee);

        // Replace entire case team; removes sender and employee and then adds receiver and employee
        const newTeam = new CaseTeam([new CaseTeamMember(receiver, [requestorRole]), new CaseTeamMember(employee)]);
        await caseTeamService.setCaseTeam(caseInstance, sender, newTeam);

        // So now sender no longer has access, but the others do.
        console.log("Added recwiver, now fetchting case on his behalf")
        await caseService.getCase(caseInstance, receiver);
        console.log("Added employee, now fetchting case on his behalf")
        await caseService.getCase(caseInstance, employee);
        await caseService.getCase(caseInstance, sender, false);

        // Compare the case team with both what the GET case API thinks it is and what the GET case team API thinks it is
        const newCase = await caseService.getCase(caseInstance, employee);
        Comparison.sameJSON(newTeam, newCase.team);

        const actualCaseTeam = await caseTeamService.getCaseTeam(caseInstance, employee);
        Comparison.sameJSON(actualCaseTeam, newTeam);

        await caseTeamService.getCaseTeam(caseInstance, employee).then(team => {
            console.log('1. Team: ' + JSON.stringify(team, undefined, 2));
            console.log('1. Employee roles: ' + team.find(employee)?.roles);
            console.log('1. Receiver roles: ' + team.find(receiver)?.roles);
        });


        // Add a role that is not defined in the case model should not be possible
        await caseTeamService.setMember(caseInstance, receiver, new CaseTeamMember(receiver, [notExistingRole]), false);

        // Add an empty role should be possible through setting a member
        await caseTeamService.setMember(caseInstance, receiver, new CaseTeamMember(employee, [emptyRole]));
        // But not when directly assigning the role
        await caseTeamService.addMemberRole(caseInstance, receiver, new CaseTeamMember(employee), 'a/b/c', false);
        await caseTeamService.addMemberRole(caseInstance, receiver, new CaseTeamMember(employee), '', false);

        // Now add approver role to the employee and see if that works
        await caseTeamService.setMember(caseInstance, receiver, new CaseTeamMember(employee, [approverRole]));
        // Now add approver role to the receiver and see if that works
        await caseTeamService.setMember(caseInstance, receiver, new CaseTeamMember(receiver, [requestorRole, approverRole]));

        await caseTeamService.getCaseTeam(caseInstance, employee).then(team => {
            console.log('2. Team: ' + JSON.stringify(team, undefined, 2));
            console.log('2. Employee roles: ' + team.find(employee)?.roles);
            console.log('2. Receiver roles: ' + team.find(receiver)?.roles);
        });

        await caseTeamService.removeMemberRole(caseInstance, receiver, new CaseTeamMember(receiver), requestorRole);
        await caseTeamService.addMemberRole(caseInstance, receiver, new CaseTeamMember(receiver), paRole);
        await caseTeamService.getCaseTeam(caseInstance, employee).then(team => {
            console.log('2. Team: ' + JSON.stringify(team, undefined, 2));
            console.log('2. Employee roles: ' + team.find(employee)?.roles);
            console.log('2. Receiver roles: ' + team.find(receiver)?.roles);
        });

    }
}