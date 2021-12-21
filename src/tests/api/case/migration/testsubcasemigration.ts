'use strict';

import TaskService from '../../../../framework/service/task/taskservice';
import TestCase from '../../../../framework/test/testcase';
import RepositoryService from '../../../../framework/service/case/repositoryservice';
import CaseTeam from '../../../../framework/cmmn/team/caseteam';
import CaseService from '../../../../framework/service/case/caseservice';
import CaseMigrationService, { DefinitionMigration } from '../../../../framework/service/case/casemigrationservice';
import WorldWideTestTenant from '../../../worldwidetesttenant';
import { findTask } from '../../../../framework/test/caseassertions/task';
import { CaseOwner } from '../../../../framework/cmmn/team/caseteamuser';
import CaseTeamUser from "../../../../framework/cmmn/team/caseteamuser";
import CaseTeamService from '../../../../framework/service/case/caseteamservice';

const base_definition = 'migration/migration_v0.xml';
const definitionMigrated = 'migration/migration_v1.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestSubCaseMigration extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, base_definition, tenant);
        await RepositoryService.validateAndDeploy(user, definitionMigrated, tenant);
    }

    async run() {
        const inputs = {
            Input: {
                Message: 'Hello there',
                From: user.id
            }
        };
        
        const caseTeam = new CaseTeam([
            new CaseOwner(user, ["role1", "role2", "role3", "role4"]), 
            new CaseTeamUser(worldwideTenant.receiver, ["role3"])
        ]);
        const startCase = { 
            tenant, 
            definition: base_definition,
            inputs,
            caseTeam
        };

        const firstTaskName = 'HumanTask';
        const taskOutput = {};

        const migratedDefinition = new DefinitionMigration(definitionMigrated);

        // Now start running the script

        const case1_before = await CaseService.startCase(user, startCase).then(instance => CaseService.getCase(user, instance));
        // const case2_before = await caseService.startCase(user, startCase).then(instance => caseService.getCase(user, instance));

        const case1Tasks_before = await TaskService.getCaseTasks(user, case1_before);
        // const case2Tasks_before = await taskService.getCaseTasks(user, case2_before);
        const case1FirstTask = findTask(case1Tasks_before, firstTaskName);
        // const case2FirstTask = findTask(case2Tasks_before, firstTaskName);

        const case1Team_before = await CaseTeamService.getCaseTeam(user, case1_before);
        // const case2Team_before = await caseTeamService.getCaseTeam(user, case2_before);

        // await SomeTime(5000, `\nPausing 5 sec before migration of case ${case1_before.id}\n`);

        // Now complete the task in case 1
        await TaskService.completeTask(user, case1FirstTask, taskOutput);

        // Migrate caseInstance1, and then complete the task in case1
        const case1_after = await CaseMigrationService.migrateDefinition(user, case1_before, migratedDefinition).then(() => CaseService.getCase(user, case1_before));

        console.log(`Case ID: ${case1_after.id}\n`);

        console.log(`Sub Case ID: ${case1_after.planitems.find(item => item.name === 'migration_subcase')?.id}\n`);
    }
}