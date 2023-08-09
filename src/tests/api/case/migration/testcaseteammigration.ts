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
import User from '@cafienne/typescript-client/user';
import Comparison from '@cafienne/typescript-client/test/comparison';

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

        // Check that the case team is updated as well; 1 new member, and some roles dropped.
        await checkCaseTeam(sender, caseId, newCaseTeam);
        console.log(`\nCase ID: ${caseId}\n`);
        console.log(`Sub Case ID: ${subCaseId}\n`);

        // Also sub case team must have been updated with the same members.
        await checkCaseTeam(sender, caseId, newCaseTeam);

        console.log(`\nCase ID: ${caseId}\n`);
        console.log(`Sub Case ID: ${subCaseId}\n`);
    }
}

async function checkCaseTeam(user: User, caseId: string, expectedTeam: CaseTeam): Promise<CaseTeam> {
    return await PollUntilSuccess(async () => {
        const currentCaseTeam = await CaseTeamService.getCaseTeam(sender, caseId);
        const findMember = (expectedMember: CaseTeamUser) => {
            const member = currentCaseTeam.users.find(user => user.userId === expectedMember.userId);
            if (!member) {
                throw new Error(`Cannot find case team user ${expectedMember.userId}`);
            }
            if (! Comparison.sameArray(member.caseRoles, expectedMember.caseRoles)) {
                throw new Error(`Case team user ${member.userId} does not have the expected roles`);
            }
        }
        expectedTeam.users.forEach(user => findMember(user));
        return currentCaseTeam;
    }, 'Awaiting case team to match the updated definition');
}
