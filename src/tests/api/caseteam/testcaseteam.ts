'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import CaseTeamMember from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import TenantService from '../../../framework/service/tenant/tenantservice';
import TaskService from '../../../framework/service/task/taskservice';
import { assertTask, findTask, assertTaskCount } from '../../../framework/test/assertions';
import Case from '../../../framework/cmmn/case';
import TestCaseTeam1 from './testcaseteam1';
import TestCaseTeam2 from './testcaseteam2';
import TestCaseTeam3 from './testcaseteam3';

const repositoryService = new RepositoryService();

const caseService = new CaseService();
const caseTeamService = new CaseTeamService();
const taskService = new TaskService();
const tenantName = Math.random().toString(36).substring(7);
const worldwideTenant = new WorldWideTestTenant(tenantName);
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const employee = worldwideTenant.employee;
const testCaseTeam1 = new TestCaseTeam1();
const testCaseTeam2 = new TestCaseTeam2();
const testCaseTeam3 = new TestCaseTeam3();

const definition = 'caseteam.xml';
const requestorRole = 'Requestor';

export default class TestCaseTeam extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, sender, tenant);
    }

    async run() {
        console.log(`\n
#############################################
#   Starting test scenario-1 of case team.  #
#############################################
        `);
        // await testCaseTeam1.run(worldwideTenant);

        console.log(`\n
#############################################
#   Starting test scenario-2 of case team.  #
#############################################
        `);
        // await testCaseTeam2.run(worldwideTenant);

        console.log(`\n
#############################################
#   Starting test scenario-3 of case team.  #
#############################################
        `);
        await testCaseTeam3.run(worldwideTenant);
    }
}