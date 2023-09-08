'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import CaseTeam from '../../../cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from "../../../cmmn/team/caseteamuser";
import CaseFilter from '../../../service/case/casefilter';
import CaseService from '../../../service/case/caseservice';
import CaseTeamService from '../../../service/case/caseteamservice';
import TestCase from '../../../test/testcase';
import User from '../../../user';
import WorldWideTestTenant from '../../worldwidetesttenant';

const definition = Definitions.HelloWorld;
const worldwideTenant = new WorldWideTestTenant("abc");
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const employee = worldwideTenant.employee;

export default class TestGetCases extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(sender, tenant);
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