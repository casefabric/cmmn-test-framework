'use strict';

import TaskService from '@cafienne/typescript-client/service/task/taskservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import Case from '@cafienne/typescript-client/cmmn/case';
import CaseTeam from '@cafienne/typescript-client/cmmn/team/caseteam';
import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import CaseMigrationService, { DefinitionMigration } from '@cafienne/typescript-client/service/case/casemigrationservice';
import WorldWideTestTenant from '../../../worldwidetesttenant';
import { findTask } from '@cafienne/typescript-client/test/caseassertions/task';
import CaseFileService from '@cafienne/typescript-client/service/case/casefileservice';
import { CaseOwner } from '@cafienne/typescript-client/cmmn/team/caseteamuser';
import CaseTeamUser from "@cafienne/typescript-client/cmmn/team/caseteamuser";
import CaseTeamService from '@cafienne/typescript-client/service/case/caseteamservice';
import CasePlanService from '@cafienne/typescript-client/service/case/caseplanservice';

const base_definition = 'helloworld_base.xml';
const definitionMigrated = 'helloworld_migrated.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestCaseTeamMigration extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, base_definition, tenant);
        await RepositoryService.validateAndDeploy(user, definitionMigrated, tenant);
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: user.id
            }
        };
        
        const caseTeam = new CaseTeam([
            new CaseOwner(user, ["ADMIN", "TempRole"]), 
            new CaseTeamUser(worldwideTenant.receiver, ["OneMore"])
        ]);
        const startCase = { 
            tenant, 
            definition: base_definition,
            inputs,
            caseTeam
        };

        const firstTaskName = 'Receive Greeting and Send response';
        const secondTaskName = 'Read response';
        const taskOutput = {
            Response: {
                Message: 'Toedeledoki',
            }
        };

        const migratedDefinition = new DefinitionMigration("helloworld_migrated.xml");

        // Now start running the script

        const case1_before = await CaseService.startCase(user, startCase).then(instance => CaseService.getCase(user, instance));
        const case2_before = await CaseService.startCase(user, startCase).then(instance => CaseService.getCase(user, instance));

        const case1Tasks_before = await TaskService.getCaseTasks(user, case1_before);
        const case2Tasks_before = await TaskService.getCaseTasks(user, case2_before);
        const case1FirstTask = findTask(case1Tasks_before, firstTaskName);
        const case2FirstTask = findTask(case2Tasks_before, firstTaskName);

        const case1Team_before = await CaseTeamService.getCaseTeam(user, case1_before);
        const case2Team_before = await CaseTeamService.getCaseTeam(user, case2_before);

        const case1PlanItemsBefore = await CasePlanService.getPlanItems(user, case1_before).then(items => items.map(item => `${item.type} ${item.name}[${item.index}] is ${item.currentState}; id: ${item.id}`));
        const case1TasksBefore = await TaskService.getCaseTasks(user, case1_before).then(tasks => tasks.map(task => `${task.taskName}[${task.id}] is ${task.taskState};`));

        // Migrate caseInstance1, and then complete the task in case1
        const case1_after = await CaseMigrationService.migrateDefinition(user, case1_before, migratedDefinition).then(() => CaseService.getCase(user, case1_before));
        return;
        const case1PlanItemsAfter = await CasePlanService.getPlanItems(user, case1_after).then(items => items.map(item => `${item.type} ${item.name}[${item.index}] is ${item.currentState}; id: ${item.id}`));
        const case1TasksAfter = await TaskService.getCaseTasks(user, case1_after).then(tasks => tasks.map(task => `${task.taskName}[${task.id}] is ${task.taskState};`));

        // Now complete the task in case 1
        await TaskService.completeTask(user, case1FirstTask, taskOutput);

        // Complete task in case2 and then migrate case2
        await TaskService.completeTask(user, case2FirstTask, taskOutput);
        const case2_after = await CaseMigrationService.migrateDefinition(user, case2_before, migratedDefinition).then(() => CaseService.getCase(user, case2_before));

        this.checkCaseIDandNames(case1_before, case1_after);
        this.checkCaseIDandNames(case2_before, case2_after);

        await this.checkCaseFile(case1_after, taskOutput.Response.Message + 'IS ALWAYS EXTENDED');
        await this.checkCaseFile(case2_after, taskOutput.Response.Message);

        const case1Team_after = await CaseTeamService.getCaseTeam(user, case1_after);
        const case2Team_after = await CaseTeamService.getCaseTeam(user, case2_after);

        console.log("UnMigrated case team: " + JSON.stringify(case2Team_before, undefined, 2));
        console.log("\n\nMigrated case team: " + JSON.stringify(case1Team_after, undefined, 2));

        await CasePlanService.getPlanItems(user, case2_after).then(items => {
            console.log("\n\nUnmigrated tasks after completion: ");
            items.forEach(item => console.log(`${item.type} ${item.name}[${item.index}] is ${item.currentState}; id: ${item.id}`));
        });

        await CasePlanService.getPlanItems(user, case1_after).then(items => {
            console.log("\n\nMigrated tasks after completion: ");
            items.forEach(item => console.log(`${item.type} ${item.name}[${item.index}] is ${item.currentState}; id: ${item.id}`));
        });

        await CasePlanService.getPlanItems(user, case2_after).then(items => {
            console.log("\n\nUnmigrated tasks after migration: ");
            items.forEach(item => console.log(`${item.type} ${item.name}[${item.index}] is ${item.currentState}; id: ${item.id}`));
        });

        console.log("Case2 team AFTER migration: " + JSON.stringify(case2Team_after, undefined, 2));

        await CaseFileService.getCaseFile(user, case1_after).then(file => console.log("Migrated File Case1: " + JSON.stringify(file, undefined, 2)));

        await CaseFileService.getCaseFile(user, case2_after).then(file => console.log("\n\n\nMigrated File Case2: " + JSON.stringify(file, undefined, 2)));

        console.log(`\nCase1 ID: ${case1_after.id}\n`);
        console.log(`Case2 ID: ${case2_after.id}\n`);

        console.log("\n\nCase Plan Before: " + case1PlanItemsBefore.join('\n\t'));
        console.log("\n\nCase Plan After: " + case1PlanItemsAfter.join('\n\t'));
        console.log("\n\nCase Tasks Before: " + case1TasksBefore.join('\n\t'));
        console.log("\n\nCase Tasks After: " + case1TasksAfter.join('\n\t'));

        this.checkCaseRoles(case1Team_before, case1Team_after);
        this.checkCaseRoles(case2Team_before, case2Team_after);
    }

    checkCaseIDandNames(case_before: Case, case_after: Case) {
        const caseName_before = 'HelloWorld';
        const caseName_after = 'HelloWorld_Migrated';

        console.log(`Validating Case name changed; found before case name '${case_before.caseName}' and after case name '${case_after.caseName}'`);

        if (case_before.id !== case_after.id) {
            throw new Error(`Comparing two different case instances is not allowed, with before id ${case_before.id} and after id ${case_after.id}`);
        }

        if (case_before.caseName !== caseName_before) {
            throw new Error(`Expected original case name to be ${caseName_before}, but found ${case_before.caseName} instead on case ${case_before.id}`);
        }

        if (case_after.caseName !== caseName_after) {
            throw new Error(`Expected migrated case name to be ${caseName_after}, but found ${case_after.caseName} instead on case ${case_after.id}`);
        }

        // Clear id of case_before, so that no longer (accidentally) can be used in retrievals
        case_before.id = '';
    }

    async checkCaseFile(case_after: Case, expectedMessage: string) {
        const response = await CaseFileService.getCaseFile(user, case_after).then(file => file.Response);
        const message = response.Message;
        console.log(`Case file of migrated case has response message '${message}'`);
        if (message !== expectedMessage) {
            throw new Error(`Expected case file to have response message '${expectedMessage}', but found '${message}'`);
        }
    }

    checkCaseRoles(caseteam_before: CaseTeam, caseteam_after: CaseTeam) {
        const expectedRolesBefore = ['ADMIN', 'TempRole', 'OneMore'];
        const expectedRolesAfter = ['ADMIN', 'With a decent name'];

        const foundRolesBefore = caseteam_before.caseRoles || [];
        const foundRolesAfter = caseteam_after.caseRoles || [];

        expectedRolesBefore.forEach(role => {
            if (!foundRolesBefore.find(caseRole => caseRole === role)) {
                throw new Error(`Could not find case role ${role} in case team before`);
            }
        });

        expectedRolesAfter.forEach(role => {
            if (!foundRolesAfter.find(caseRole => caseRole === role)) {
                throw new Error(`Could not find case role ${role} in case team after`);
            }
        });
    }
}