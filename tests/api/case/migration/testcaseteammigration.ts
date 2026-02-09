'use strict';

import Definitions from '../../../../src/cmmn/definitions/definitions';
import CaseTeam from '../../../../src/cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from "../../../../src/cmmn/team/caseteamuser";
import CaseMigrationService, { DefinitionMigration } from '../../../../src/service/case/casemigrationservice';
import CaseService from '../../../../src/service/case/caseservice';
import CaseTeamService from '../../../../src/service/case/caseteamservice';
import TaskService from '../../../../src/service/task/taskservice';
import { findTask } from '../../../../src/test/caseassertions/task';
import Comparison from '../../../../src/test/comparison';
import TestCase from '../../../../src/test/testcase';
import { PollUntilSuccess } from '../../../../src/test/time';
import User from '../../../../src/user';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';

const base_definition = Definitions.Migration_v0;
const definitionMigrated = Definitions.Migration_v1;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;

export default class TestCaseTeamMigration extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await base_definition.deploy(sender, tenant);
        await definitionMigrated.deploy(sender, tenant);
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
        this.addIdentifier(caseId);
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

        const migratedDefinition = new DefinitionMigration(definitionMigrated, newCaseTeam);

        // Migrate caseInstance1, and then complete the task in case
        await CaseMigrationService.migrateDefinition(sender, case_before, migratedDefinition);

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
