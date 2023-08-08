'use strict';

import { PollUntilSuccess, SomeTime } from '@cafienne/typescript-client';
import Case from '@cafienne/typescript-client/cmmn/case';
import CaseTeam from '@cafienne/typescript-client/cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from "@cafienne/typescript-client/cmmn/team/caseteamuser";
import CaseMigrationService, { DefinitionMigration } from '@cafienne/typescript-client/service/case/casemigrationservice';
import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import TaskService from '@cafienne/typescript-client/service/task/taskservice';
import { findTask } from '@cafienne/typescript-client/test/caseassertions/task';
import TestCase from '@cafienne/typescript-client/test/testcase';
import WorldWideTestTenant from '../../../worldwidetesttenant';

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

        const mainCase_before = await CaseService.startCase(user, startCase).then(instance => CaseService.getCase(user, instance));
        const mainCaseId = mainCase_before.id;
        const subCaseId = mainCase_before.planitems.find(item => item.name === 'migration_subcase')?.id;
        if (!subCaseId) {
            throw new Error('Expected to find sub case named "migration_subcase", but could not find it');
        }

        // Now complete the task in case, to trigger the subcase
        await TaskService.getCaseTasks(user, mainCase_before).then(async tasks => await TaskService.completeTask(user, findTask(tasks, 'HumanTask')));

        const subCase_before = await PollUntilSuccess(async () => CaseService.getCase(user, subCaseId)) as Case;
        const subcaseTasks_before = await TaskService.getCaseTasks(user, subCaseId);

        // await SomeTime(5000, `\nPausing 5 sec before migration of case ${migration_subcase_before.id}\n`);

        // Try to migrate the definition of the subcase, this should not be allowed, as this can only be done on main cases.
        await CaseMigrationService.migrateDefinition(user, subCase_before, migratedDefinition, 400);

        // Migrate the main case, and then check that the sub case has additional tasks
        await CaseMigrationService.migrateDefinition(user, mainCase_before, migratedDefinition);
        const mainCase_after = await CaseService.getCase(user, mainCaseId);

        await SomeTime(1000);

        const subcaseTasks_after = await TaskService.getCaseTasks(user, subCaseId);
        if (subcaseTasks_before.length + 1 !== subcaseTasks_after.length) {
            throw new Error(`Expected to find an additional task in the sub case after migration, but found ${subcaseTasks_after.length}`);
        }

        console.log(`Case ID: ${mainCaseId}\n`);

        console.log(`Sub Case ID: ${subCaseId}\n`);
    }
}