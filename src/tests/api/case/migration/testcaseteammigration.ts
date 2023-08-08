'use strict';

import TaskService from '@cafienne/typescript-client/service/task/taskservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import CaseTeam from '@cafienne/typescript-client/cmmn/team/caseteam';
import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import CaseMigrationService, { DefinitionMigration } from '@cafienne/typescript-client/service/case/casemigrationservice';
import WorldWideTestTenant from '../../../worldwidetesttenant';
import { findTask } from '@cafienne/typescript-client/test/caseassertions/task';
import { CaseOwner } from '@cafienne/typescript-client/cmmn/team/caseteamuser';
import CaseTeamUser from "@cafienne/typescript-client/cmmn/team/caseteamuser";
import CaseTeamService from '@cafienne/typescript-client/service/case/caseteamservice';
import { ExtendedCaseMigrationService, ExtendedDefinitionMigration } from '../../../../nextversion/nextversion';
import { PollUntilSuccess, ServerSideProcessing, SomeTime, assertCaseTeam, assertCaseTeamUser } from '@cafienne/typescript-client';

const base_definition = 'migration/migration_v0.xml';
const definitionMigrated = 'migration/migration_v1.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;

export default class TestCaseTeamMigration extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(sender, base_definition, tenant);
        await RepositoryService.validateAndDeploy(sender, definitionMigrated, tenant);
    }

    async run() {
        const inputs = {
            Input: {
                Message: 'Hello there',
                From: sender.id
            }
        };

        const caseTeam = new CaseTeam([
            new CaseOwner(sender, ["role1", "role2", "role3", "role4"]),
            new CaseTeamUser(worldwideTenant.receiver, ["role3"]),
            new CaseTeamUser('just_a_user_id', ["role4"])
        ]);
        const startCase = {
            tenant,
            definition: base_definition,
            inputs,
            caseTeam
        };


        // Now start running the script

        const case_before = await CaseService.startCase(sender, startCase).then(instance => CaseService.getCase(sender, instance));
        const caseId = case_before.id;
        const subCaseId = case_before.planitems.find(item => item.name === 'migration_subcase')?.id;
        if (!subCaseId) {
            throw new Error('Expected to find sub case named "migration_subcase", but could not find it');
        }

        // Now complete the task in case, to trigger the subcase
        await TaskService.getCaseTasks(sender, case_before).then(async tasks => await TaskService.completeTask(sender, findTask(tasks, 'HumanTask')));

        const newCaseTeam = new CaseTeam([
            new CaseOwner(sender, ["role1", "role3_v1"]),
            new CaseTeamUser(worldwideTenant.receiver, ["role2"]),
            new CaseTeamUser(worldwideTenant.employee, ["role3_v1"])
        ]);

        const migratedDefinition = new ExtendedDefinitionMigration(definitionMigrated, newCaseTeam);

        // Migrate caseInstance1, and then complete the task in case
        await ExtendedCaseMigrationService.migrateDefinition(sender, case_before, migratedDefinition);


        const caseTeam_after = await CaseTeamService.getCaseTeam(sender, case_before);
        console.log("New Case Team after migration: ", caseTeam_after);
        console.log(`\nCase ID: ${caseId}\n`);
        console.log(`Sub Case ID: ${subCaseId}\n`);

        await assertCaseTeam(sender, caseId, newCaseTeam);

        // Also sub case team must have been updated, but let's poll it as sub case migration is asynchronous and may need little more time
        await PollUntilSuccess(async () => {
            assertCaseTeam(sender, subCaseId, newCaseTeam);
        });

        console.log(`\nCase ID: ${caseId}\n`);
        console.log(`Sub Case ID: ${subCaseId}\n`);
    }
}