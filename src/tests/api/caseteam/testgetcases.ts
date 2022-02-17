'use strict';

import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import CaseTeam from '@cafienne/typescript-client/cmmn/team/caseteam';
import { CaseOwner } from '@cafienne/typescript-client/cmmn/team/caseteamuser';
import CaseTeamUser from "@cafienne/typescript-client/cmmn/team/caseteamuser";
import CaseFilter from '@cafienne/typescript-client/service/case/casefilter';
import User from '@cafienne/typescript-client/user';
import CaseTeamService from '@cafienne/typescript-client/service/case/caseteamservice';
import Case from '@cafienne/typescript-client/cmmn/case';

const definition = 'helloworld.xml';

const worldwideTenant = new WorldWideTestTenant("abc");
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const employee = worldwideTenant.employee;

export default class TestGetCases extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(sender, definition, tenant);
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: sender.id
            }
        };
        const caseTeam = new CaseTeam([new CaseOwner(sender), new CaseTeamUser(receiver)]);
        
        const startCase = { tenant, definition, inputs, caseTeam, debug: true };

        await this.getCaseList({tenant, numberOfResults: 10000}, "Initial list has cases");

        const newCase = await CaseService.startCase(sender, startCase);

        await this.getCaseList({tenant, numberOfResults: 10000}, "After startcase");
        await this.getCaseList({tenant, state:"Failed"}, "Failed within tenant");
        await this.getCaseList({state:"Failed"}, "Failed across tenant");
        await this.getCaseList({tenant}, "Within tenant");
        await this.getCaseList({}, "Across tenant");
        await this.getCaseList({}, "Across tenant", receiver);
        await this.getCaseList({}, "Across tenant", employee);

        await CaseTeamService.setUser(sender, newCase, new CaseTeamUser(employee));
        
        await this.getCaseList({}, "After added to team", employee);
    }

    async getCaseList(filter: CaseFilter, msg: string, user: User = sender) {
        const caseList = await CaseService.getCases(user, filter);
        console.log(msg +": " + caseList.length);
        return caseList;
    }
}