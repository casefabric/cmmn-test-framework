'use strict';

import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import CaseTeam from '@cafienne/typescript-client/cmmn/team/caseteam';
import { CaseOwner } from '@cafienne/typescript-client/cmmn/team/caseteamuser';
import Case from '@cafienne/typescript-client/cmmn/case';
import User from '@cafienne/typescript-client/user';
import StatisticsFilter from '@cafienne/typescript-client/service/case/statisticsfilter';
import CasePlanService from '@cafienne/typescript-client/service/case/caseplanservice';

const helloworldDefinition = 'helloworld.xml';
const caseTeamDefinition = 'caseteam.xml';


const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestStatsAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(sender, helloworldDefinition, tenant);
        await RepositoryService.validateAndDeploy(sender, caseTeamDefinition, tenant);
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
        await CaseService.startCase(sender, startHelloWorldCase);
        startHelloWorldCase.caseTeam = caseTeamWithBothSenderAndReceiver;
        await CaseService.startCase(sender, startHelloWorldCase);
        const caseStarted = await CaseService.startCase(sender, startHelloWorldCase);
        const caseInstance = await CaseService.getCase(sender, caseStarted);
        const pid = caseInstance.planitems.find(item => item.type === 'CasePlan')?.id;
        if (!pid) {
            throw new Error('Cannot find case plan?!');
        }
        CasePlanService.makePlanItemTransition(sender, caseStarted, pid, "Terminate");
 
        // Start 3 cases 'caseteam.xml', and one of them with both sender and receiver
        const startCaseTeamCase = { tenant, definition: caseTeamDefinition, caseTeam, debug: true };
        await CaseService.startCase(sender, startCaseTeamCase);
        await CaseService.startCase(sender, startCaseTeamCase);
        startHelloWorldCase.caseTeam = caseTeamWithBothSenderAndReceiver;
        await CaseService.startCase(sender, startCaseTeamCase);

        const hwFilter = { definition: 'HelloWorld', tenant};
        await this.getStatistics('overall', sender);
        await this.getStatistics('Terminated', sender, {state:'Terminated'});
        await this.getStatistics('HelloWorld', sender, hwFilter);
        await this.getStatistics('overall', receiver);
        await this.getStatistics('Failed', receiver, {state:'Failed'});
        await this.getStatistics('HelloWorld', receiver, hwFilter);
    }

    async getStatistics(msg: string, user: User, filter?: StatisticsFilter) {
        await CaseService.getCaseStatistics(user, filter).then(stats => {
            console.log(`${user} statistics for '${msg}' cases:${stats.map(stat => '\n- '+stat)}`);
            return stats;
        })
    }
}