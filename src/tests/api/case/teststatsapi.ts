'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TaskService, { TaskCount } from '../../../framework/service/task/taskservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeam from '../../../framework/cmmn/caseteam';
import CaseTeamMember from '../../../framework/cmmn/caseteammember';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import { ServerSideProcessing } from '../../../framework/test/time';
import Case from '../../../framework/cmmn/case';
import User from '../../../framework/user';
import Task from '../../../framework/cmmn/task';
import StatisticsFilter from '../../../framework/service/case/statisticsfilter';
import CasePlanService from '../../../framework/service/case/caseplanservice';

const repositoryService = new RepositoryService();
const helloworldDefinition = 'helloworld.xml';
const caseTeamDefinition = 'caseteam.xml';


const caseService = new CaseService();
const taskService = new TaskService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestStatsAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(helloworldDefinition, sender, tenant);
        await repositoryService.validateAndDeploy(caseTeamDefinition, sender, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([new CaseTeamMember(sender, undefined, true)]);
        const caseTeamWithBothSenderAndReceiver = new CaseTeam([
            new CaseTeamMember(sender, undefined, true)
            , new CaseTeamMember(receiver, undefined, true)]);
        

        // Start 3 cases helloworld cases; 1 with only sender, next 2 with sender and receiver;
        //  Make one case go to Terminated state
        const inputs = { Greeting: { Message: 'Hello there', From: sender.id } };
        const startHelloWorldCase = { tenant, definition: helloworldDefinition, inputs, caseTeam, debug: true };
        await caseService.startCase(startHelloWorldCase, sender);
        startHelloWorldCase.caseTeam = caseTeamWithBothSenderAndReceiver;
        await caseService.startCase(startHelloWorldCase, sender);
        const caseStarted = await caseService.startCase(startHelloWorldCase, sender) as Case;
        const caseInstance = await caseService.getCase(caseStarted, sender);
        const pid = caseInstance.planitems.find(item => item.type === 'CasePlan')?.id;
        if (!pid) {
            throw new Error('Cannot find case plan?!');
        }
        new CasePlanService().makePlanItemTransition(caseStarted, sender, pid, "Terminate");
 
        // Start 3 cases 'caseteam.xml', and one of them with both sender and receiver
        const startCaseTeamCase = { tenant, definition: caseTeamDefinition, caseTeam, debug: true };
        await caseService.startCase(startCaseTeamCase, sender);
        await caseService.startCase(startCaseTeamCase, sender);
        startHelloWorldCase.caseTeam = caseTeamWithBothSenderAndReceiver;
        await caseService.startCase(startCaseTeamCase, sender) as Case;

        const hwFilter = { definition: 'HelloWorld', tenant};
        await this.getStatistics('overall', sender);
        await this.getStatistics('Terminated', sender, {state:'Terminated'});
        await this.getStatistics('HelloWorld', sender, hwFilter);
        await this.getStatistics('overall', receiver);
        await this.getStatistics('Failed', receiver, {state:'Failed'});
        await this.getStatistics('HelloWorld', receiver, hwFilter);
        return;


    }

    async getStatistics(msg: string, user: User, filter?: StatisticsFilter) {
        await caseService.getCaseStatistics(user, filter).then(stats => {
            console.log(`${user.id} statistics for '${msg}' cases:${stats.map(stat => '\n- '+stat)}`);
            return stats;
        })
    }
}