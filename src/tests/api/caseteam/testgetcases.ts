'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TaskService from '../../../framework/service/task/taskservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeam from '../../../framework/cmmn/caseteam';
import CaseTeamMember, { CaseOwner } from '../../../framework/cmmn/caseteammember';
import CaseFilter from '../../../framework/service/case/casefilter';
import User from '../../../framework/user';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import Case from '../../../framework/cmmn/case';

const repositoryService = new RepositoryService();
const definition = 'helloworld.xml';

const caseService = new CaseService();
const taskService = new TaskService();
const worldwideTenant = new WorldWideTestTenant("abc");
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const employee = worldwideTenant.employee;

export default class TestGetCases extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(sender, definition, tenant);
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: sender.id
            }
        };
        const caseTeam = new CaseTeam([new CaseOwner(sender), new CaseTeamMember(receiver)]);
        
        const startCase = { tenant, definition, inputs, caseTeam, debug: true };

        await this.getCaseList({tenant, numberOfResults: 10000}, "Initial list has cases");

        const newCase = await caseService.startCase(sender, startCase) as Case;

        await this.getCaseList({tenant, numberOfResults: 10000}, "After startcase");
        await this.getCaseList({tenant, state:"Failed"}, "Failed within tenant");
        await this.getCaseList({state:"Failed"}, "Failed across tenant");
        await this.getCaseList({tenant}, "Within tenant");
        await this.getCaseList({}, "Across tenant");
        await this.getCaseList({}, "Across tenant", receiver);
        await this.getCaseList({}, "Across tenant", employee);

        await new CaseTeamService().setMember(newCase, sender, new CaseTeamMember(employee));
        
        await this.getCaseList({}, "After added to team", employee);
    }

    async getCaseList(filter: CaseFilter, msg: string, user: User = sender) {
        const caseList = await caseService.getCases(user, filter);
        console.log(msg +": " + caseList.length);
        return caseList;
    }
}