'use strict';

import Case from '../../../../src/cmmn/case';
import Definitions from '../../../definitions/definitions';
import CaseTeam from '../../../../src/cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from "../../../../src/cmmn/team/caseteamuser";
import CaseFileService from '../../../../src/service/case/casefileservice';
import CaseService from '../../../../src/service/case/caseservice';
import RepositoryService from '../../../../src/service/case/repositoryservice';
import TestCase from '../../../../src/test/testcase';
import WorldWideTestTenant from '../../../../src/tests/setup/worldwidetesttenant';

const definition = Definitions.EntryCriteriaOnCaseInputParameters;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const employee = worldwideTenant.employee;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestEntryCriteriaOnCaseInputParameters extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(sender, tenant);
    }

    async run() {
        //*
        const case1 = await this.testWithTwoChildrenInStartCase();
        const case2 = await this.testAddingTwoChildren_in_one_shot();
        const case3 = await this.testAddingTwoChildren_one_at_a_time();
        this.addIdentifier(case1);
        this.addIdentifier(case2);
        this.addIdentifier(case3);

        /*/
                const case1 = await this.testAddingTwoChildren_in_one_shot();   
                const case2 = case1;
                const case3 = case1;
        //*/

        console.log('Resulting cases: ');
        printCaseSummary(case1);
        printCaseSummary(case2);
        printCaseSummary(case3);

        console.log("\n\n")
        printCaseSummary(case1);

        const numPlanItemsCase1 = case1.planitems.length;
        if (numPlanItemsCase1 != case2.planitems.length) {
            throw new Error(`Case 1 ${numPlanItemsCase1} plan items, and case 2 has ${case2.planitems.length}. Expecting to have same amount of plan items in first 2 cases, but it differs`);
        }
        if (numPlanItemsCase1 != case3.planitems.length) {
            throw new Error(`Case 1 ${numPlanItemsCase1} plan items, and case 3 has ${case3.planitems.length}. Expecting to have same amount of plan items in first and third case, but it differs`);
        }
        console.log(`\nPositive test result: found ${case1.planitems.length} plan items in all three cases`);

        await CaseFileService.createCaseFileItem(sender, case1, 'Greeting/Child', { name: 'child3' });
        const changedCase1 = await CaseService.getCase(sender, case1);
        if (case1.planitems.length + 2 != changedCase1.planitems.length) {
            throw new Error('Creating another case file item in first case should lead to new Stage and Task, but apparently that is not working anymore');
        }

        console.log(`\nPositive test result: switching internal CaseFile TransitionPublisher did not make a difference in case ${case1.id}`);
    }

    async testWithTwoChildrenInStartCase() {
        const inputs = {
            Greeting: {
                Child: [{
                    name: 'child1'
                }, {
                    name: 'child2'
                }


                ],
                Message: 'Hello there',
                From: sender.id
            }
        };
        const caseTeam = new CaseTeam([new CaseOwner(employee), new CaseTeamUser(sender), new CaseTeamUser(receiver)]);

        const startCase = { tenant, definition, inputs, caseTeam, debug: true };

        const caseInstance = await CaseService.startCase(sender, startCase);

        return await CaseService.getCase(sender, caseInstance);
    }

    async testAddingTwoChildren_in_one_shot() {
        const inputs = {
            Greeting: {
                Child: [],
                Message: 'Hello there',
                From: sender.id
            }
        };
        const caseTeam = new CaseTeam([new CaseOwner(employee), new CaseTeamUser(sender), new CaseTeamUser(receiver)]);

        const startCase = { tenant, definition, inputs, caseTeam, debug: true };

        const caseInstance = await CaseService.startCase(sender, startCase);

        await CaseService.getCase(sender, caseInstance).then(printCaseSummary);

        await CaseFileService.updateCaseFileItem(sender, caseInstance, 'Greeting', { Child: [{ name: 'child1' }, { name: 'child2' }] });

        return await CaseService.getCase(sender, caseInstance);

    }

    async testAddingTwoChildren_one_at_a_time() {
        const inputs = {
            Greeting: {
                Child: [],
                Message: 'Hello there',
                From: sender.id
            }
        };
        const caseTeam = new CaseTeam([new CaseOwner(employee), new CaseTeamUser(sender), new CaseTeamUser(receiver)]);

        const startCase = { tenant, definition, inputs, caseTeam, debug: true };

        const caseInstance = await CaseService.startCase(sender, startCase);

        await CaseService.getCase(sender, caseInstance).then(printCaseSummary);

        await CaseFileService.createCaseFileItem(sender, caseInstance, 'Greeting/Child', { name: 'child1' });
        await CaseService.getCase(sender, caseInstance).then(printCaseSummary);

        await CaseFileService.createCaseFileItem(sender, caseInstance, 'Greeting/Child', { name: 'child2' });

        return await CaseService.getCase(sender, caseInstance).then(printCaseSummary);
    }
}

function printCaseSummary(c: Case) {
    const messages: Array<String> = ['\n'];
    const name = c.caseName;
    const id = c.id;
    messages.push(`Case[${c.caseName}] has id ${c.id}`);
    const numPlanItems = c.planitems.length;
    messages.push(`CasePlan has ${numPlanItems} items:`);
    const tasks = c.planitems.filter(p => p.type === 'HumanTask').map(p => `'${p.name}.${p.index}' in state ${p.currentState}`);
    messages.push(` Tasks:\n  - ${tasks.join('\n  - ')}`);
    const stages = c.planitems.filter(p => p.type === 'Stage').map(p => `'${p.name}.${p.index}' in state ${p.currentState}`);
    messages.push(` Stages:\n  - ${stages.join('\n  - ')}`);
    const numTeamMembers = c.team.users.length;
    const numOwners = c.team.users.filter(m => m.isOwner).length;
    messages.push(`CaseTeam: ${numTeamMembers} members with ${numOwners} owners`);
    console.log(messages.join('\n'));
    return c;
}