'use strict';

import CaseTeam from '../../../cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from "../../../cmmn/team/caseteamuser";
import CaseService from '../../../service/case/caseservice';
import CaseTeamService from '../../../service/case/caseteamservice';
import RepositoryService from '../../../service/case/repositoryservice';
import StartCase from '../../../service/case/startcase';
import { assertCaseTeam } from '../../../test/caseassertions/team';
import TestCase from '../../../test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';

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
        this.addIdentifier(caseInstance);

        assertCaseTeam(receiver, caseInstance, caseTeam2);

        // receiver cannot add sender with empty role
        await CaseTeamService.setUser(receiver, caseInstance, new CaseTeamUser(sender, [emptyRole]), 400);

        // receiver can add sender without roles
        await CaseTeamService.setUser(receiver, caseInstance, new CaseTeamUser(sender, []));

        await CaseTeamService.setUser(receiver, caseInstance, new CaseTeamUser(sender, [emptyRole]), 400);
   }
}