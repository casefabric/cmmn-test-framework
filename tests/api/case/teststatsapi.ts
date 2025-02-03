'use strict';

import Definitions from '../../definitions/definitions';
import State from '../../../src/cmmn/state';
import CaseTeam from '../../../src/cmmn/team/caseteam';
import { CaseOwner } from '../../../src/cmmn/team/caseteamuser';
import Transition from '../../../src/cmmn/transition';
import CasePlanService from '../../../src/service/case/caseplanservice';
import CaseService from '../../../src/service/case/caseservice';
import StatisticsFilter from '../../../src/service/case/statisticsfilter';
import TestCase from '../../../src/test/testcase';
import User from '../../../src/user';
import WorldWideTestTenant from '../../../src/tests/setup/worldwidetesttenant';

const helloworldDefinition = Definitions.HelloWorld;
const caseTeamDefinition = Definitions.CaseTeam;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestStatsAPI extends TestCase {
    public isDefaultTest: boolean = false;

    async onPrepareTest() {
        await worldwideTenant.create();
        await helloworldDefinition.deploy(sender, tenant);
        await caseTeamDefinition.deploy(sender, tenant);
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
        CasePlanService.makePlanItemTransition(sender, caseStarted, pid, Transition.Terminate);

        // Start 3 cases 'caseteam.xml', and one of them with both sender and receiver
        const startCaseTeamCase = { tenant, definition: caseTeamDefinition, caseTeam, debug: true };
        await CaseService.startCase(sender, startCaseTeamCase);
        await CaseService.startCase(sender, startCaseTeamCase);
        startHelloWorldCase.caseTeam = caseTeamWithBothSenderAndReceiver;
        await CaseService.startCase(sender, startCaseTeamCase);

        const hwFilter = { definition: 'HelloWorld', tenant };
        await this.getStatistics('overall', sender);
        await this.getStatistics('Terminated', sender, { state: State.Terminated });
        await this.getStatistics('HelloWorld', sender, hwFilter);
        await this.getStatistics('overall', receiver);
        await this.getStatistics('Failed', receiver, { state: State.Failed });
        await this.getStatistics('HelloWorld', receiver, hwFilter);
    }

    async getStatistics(msg: string, user: User, filter?: StatisticsFilter) {
        await CaseService.getCaseStatistics(user, filter).then(stats => {
            console.log(`${user} statistics for '${msg}' cases:${stats.map(stat => '\n- ' + stat)}`);
            return stats;
        })
    }
}