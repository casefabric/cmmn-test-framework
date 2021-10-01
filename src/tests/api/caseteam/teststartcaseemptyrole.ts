'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import CaseTeamMember, { CaseOwner } from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import { assertCaseTeam } from '../../../framework/test/caseassertions/team';
import StartCase from '../../../framework/service/case/startcase';

const worldwideTenant = new WorldWideTestTenant('wwtt-4');
const definition = 'caseteam.xml';
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const approverRole = "Approver";
const paRole = "PersonalAssistant";
const emptyRole = "";

export default class TestStartCaseEmptyRole extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(sender, definition, tenant);
    }

    startCase: StartCase = { tenant, definition, debug: true };

    async run() {
        const startCase = this.startCase;

        const caseTeam1 = new CaseTeam([
            new CaseOwner(sender, [emptyRole])
        ]);

        startCase.caseTeam = caseTeam1;

        // A case with empty role should not start
        await CaseService.startCase(sender, startCase, 400);

        delete startCase.caseTeam;

        const caseTeam2 = new CaseTeam([
            new CaseOwner(receiver, [approverRole, paRole])
        ]);

        startCase.caseTeam = caseTeam2;

        // A case with valid role should start
        const caseInstance = await CaseService.startCase(sender, startCase);

        assertCaseTeam(receiver, caseInstance, caseTeam2);

        // receiver cannot add sender with empty role
        await CaseTeamService.setMember(receiver, caseInstance, new CaseTeamMember(sender, [emptyRole], 'user', false), 400);

        // receiver can add sender without roles
        await CaseTeamService.setMember(receiver, caseInstance, new CaseTeamMember(sender, [], 'user', false));

        // receiver cannot remove empty role from sender
        await CaseTeamService.removeMemberRoles(receiver, caseInstance, new CaseTeamMember(sender), [emptyRole], 400);
   }
}