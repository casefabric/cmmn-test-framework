'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeam from '../../../framework/cmmn/caseteam';
import { CaseOwner } from '../../../framework/cmmn/caseteammember';
import Case from '../../../framework/cmmn/case';
import User from '../../../framework/user';
import StatisticsFilter from '../../../framework/service/case/statisticsfilter';
import CasePlanService from '../../../framework/service/case/caseplanservice';

const repositoryService = new RepositoryService();
const helloworldDefinition = 'helloworld.xml';
const caseTeamDefinition = 'caseteam.xml';


const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestStatsAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(sender, helloworldDefinition, tenant);
        await repositoryService.validateAndDeploy(sender, caseTeamDefinition, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([new CaseOwner(sender)]);
        const caseTeamWithBothSenderAndReceiver = new CaseTeam([
            new CaseOwner(sender)
            , new CaseOwner(receiver)]);
        

        // Start 3 cases helloworld cases; 1 with only sender, next 2 with sender and receiver;
        //  Make one case go to Terminated state
        const inputs = { Greeting: { Message: 'Hello there', From: sender.id } };
        const startHelloWorldCase = { tenant, definition: helloworldDefinition, inputs, caseTeam, debug: true };
        await caseService.startCase(sender, startHelloWorldCase);
        startHelloWorldCase.caseTeam = caseTeamWithBothSenderAndReceiver;
        await caseService.startCase(sender, startHelloWorldCase);
        const caseStarted = await caseService.startCase(sender, startHelloWorldCase) as Case;
        const caseInstance = await caseService.getCase(sender, caseStarted);
        const pid = caseInstance.planitems.find(item => item.type === 'CasePlan')?.id;
        if (!pid) {
            throw new Error('Cannot find case plan?!');
        }
        new CasePlanService().makePlanItemTransition(sender, caseStarted, pid, "Terminate");
 
        // Start 3 cases 'caseteam.xml', and one of them with both sender and receiver
        const startCaseTeamCase = { tenant, definition: caseTeamDefinition, caseTeam, debug: true };
        await caseService.startCase(sender, startCaseTeamCase);
        await caseService.startCase(sender, startCaseTeamCase);
        startHelloWorldCase.caseTeam = caseTeamWithBothSenderAndReceiver;
        await caseService.startCase(sender, startCaseTeamCase) as Case;

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