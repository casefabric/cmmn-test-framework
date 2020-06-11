'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeamMember, { CaseOwner } from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import Case from '../../../framework/cmmn/case';
import { assertCaseTeam } from '../../../framework/test/assertions';

const repositoryService = new RepositoryService();
const definition = 'caseteam.xml';

const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant('wwtt-4');
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestValidStartCase extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, sender, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([
            new CaseOwner(receiver)
        ]);
        const startCase1 = { tenant, definition, debug: true, caseTeam };

        // Starting a by sender case would not result in failure
        const caseInstance = await caseService.startCase(startCase1, sender) as Case;

        // Receiver can perform get case
        await caseService.getCase(caseInstance, receiver)

        // Sender cannot perform get case
        await caseService.getCase(caseInstance, sender, false)

        await assertCaseTeam(caseInstance, receiver, caseTeam)
    }
}