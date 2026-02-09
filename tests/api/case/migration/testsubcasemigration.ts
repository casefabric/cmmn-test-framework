'use strict';

import Case from '../../../../src/cmmn/case';
import Definitions from '../../../../src/cmmn/definitions/definitions';
import CaseTeam from '../../../../src/cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from "../../../../src/cmmn/team/caseteamuser";
import CaseMigrationService, { DefinitionMigration } from '../../../../src/service/case/casemigrationservice';
import CaseService from '../../../../src/service/case/caseservice';
import TaskService from '../../../../src/service/task/taskservice';
import { findTask } from '../../../../src/test/caseassertions/task';
import TestCase from '../../../../src/test/testcase';
import { PollUntilSuccess, SomeTime } from '../../../../src/test/time';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';

const base_definition = Definitions.Migration_v0;
const definitionMigrated = Definitions.Migration_v1;

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestSubCaseMigration extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await base_definition.deploy(user, tenant);
        await definitionMigrated.deploy(user, tenant);
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
        this.addIdentifier(mainCase_before);
        const mainCaseId = mainCase_before.id;
        const subCaseId = mainCase_before.planitems.find(item => item.name === 'migration_subcase')?.id;
        if (!subCaseId) {
            throw new Error('Expected to find sub case named "migration_subcase", but could not find it');
        }
        this.addIdentifier(subCaseId);

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