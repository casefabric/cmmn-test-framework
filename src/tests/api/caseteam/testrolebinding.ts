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
import RoleBinding from '../../../framework/cmmn/rolebinding';
import TenantService from '../../../framework/service/tenant/tenantservice';
import { AssertionError } from 'assert';

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
const participantRole = "CaseParticipant";
const notExistingRole = "ThisRoleIsNotInTheCaseDefinition";
const emptyRole = "";

export default class TestRoleBinding extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, sender, tenant);
        await new TenantService().addTenantUserRole(sender, worldwideTenant.tenant, sender.id, "Receiver");
    }

    async run() {
        const caseTeam = new CaseTeam([], [
            new RoleBinding(requestorRole, sender.roles)
            , new RoleBinding(approverRole, sender.roles)
            , new RoleBinding(participantRole, receiver.roles)
        ]);
        const startCase = { tenant, definition, debug: true, caseTeam };

        const caseInstance = await caseService.startCase(startCase, sender);

        // Getting the case must be allowed for both sender and receiver
        await caseService.getCase(caseInstance, sender);

        // Print the case team
        await caseTeamService.getCaseTeam(caseInstance, sender).then(team => {
            if (caseTeam.roleBindings.length != team.roleBindings.length) {
                throw new Error("Unexpected different number of role bindings");
            }
            // assertBindings(caseTeam.roleBindings, team.roleBindings);
            console.log("Team: " + JSON.stringify(team, undefined, 2));
        })

        await caseService.getCase(caseInstance, employee, false);


        // console.log("\n\nGetting the cases\n\n")
        // return;

        // Getting the case must be allowed for both sender and receiver
        await caseService.getCase(caseInstance, sender);
        await caseService.getCase(caseInstance, receiver);
        // Getting the case is not allow for the employee, as he is not part of the case team
        // await caseService.getCase(caseInstance, employee);


    }
}