'use strict';

import Definitions from '../../definitions/definitions';
import CaseTeam from '../../../src/cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from "../../../src/cmmn/team/caseteamuser";
import CaseService from '../../../src/service/case/caseservice';
import CaseTeamService from '../../../src/service/case/caseteamservice';
import StartCase from '../../../src/service/case/startcase';
import { assertCaseTeam } from '../../../src/test/caseassertions/team';
import TestCase from '../../../src/test/testcase';
import WorldWideTestTenant from '../../../src/tests/setup/worldwidetesttenant';

const definition = Definitions.CaseTeam;
const worldwideTenant = new WorldWideTestTenant('wwtt-4');
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const approverRole = "Approver";
const paRole = "PersonalAssistant";
const emptyRole = "";

export default class TestStartCaseEmptyRole extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(sender, tenant);
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