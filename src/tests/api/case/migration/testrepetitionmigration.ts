'use strict';

import Case from '../../../../cmmn/case';
import Task from '../../../../cmmn/task';
import Definitions from '../../../../cmmn/definitions/definitions';
import CaseMigrationService, { DefinitionMigration } from '../../../../service/case/casemigrationservice';
import CaseService from '../../../../service/case/caseservice';
import DebugService from '../../../../service/case/debugservice';
import TaskService from '../../../../service/task/taskservice';
import TestCase from '../../../../test/testcase';
import { SomeTime, PollUntilSuccess } from '../../../../test/time';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';

const base_definition = Definitions.Migration_RepeatingTask_v0;
const definitionMigrated = Definitions.Migration_RepeatingTask_v1;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestRepetitionMigration extends TestCase {
    tasksFound: Array<Task> = [];

    async onPrepareTest() {
        await worldwideTenant.create();
        await base_definition.deploy(user, tenant);
        await definitionMigrated.deploy(user, tenant);
    }

    async run() {
        const inputs = {
            Unspecified: {
                Next: 1
            }
        };

        const startCase = {
            tenant,
            definition: base_definition,
            inputs
        };

        const migratedDefinition = new DefinitionMigration(definitionMigrated);

        // Now start running the script

        const caseInstance = await CaseService.startCase(user, startCase).then(instance => CaseService.getCase(user, instance));
        this.addIdentifier(caseInstance);

        await this.completeNextTask(caseInstance, 1);
        await this.completeNextTask(caseInstance, 1);
        await this.completeNextTask(caseInstance, 1);
        await this.completeNextTask(caseInstance, 1);
        await this.completeNextTask(caseInstance, 1);

        const firstTaskBatch = this.tasksFound.map(t => t.summary()).join('\n- ');
        console.log("Completed following tasks:\n- " + firstTaskBatch);

        await SomeTime(1000, 'Awaiting 1 second before case migration')

        // Migrate caseInstance1, and then complete the task in case1
        await CaseMigrationService.migrateDefinition(user, caseInstance, migratedDefinition);
        await SomeTime(2000, 'Awaiting 2 seconds after case migration')
        await DebugService.forceRecovery(user, caseInstance);
        await this.completeNextTask(caseInstance, 2);
        console.log("First completed:\n- " + firstTaskBatch);
        console.log("\nTotal completed tasks:\n- " + this.tasksFound.map(t => t.summary()).join('\n- '));
    }

    async completeNextTask(case1_before: Case, expectedNumberOfActiveTasks: number) {
        return await PollUntilSuccess(async () => {
            const tasks = await TaskService.getCaseTasks(user, case1_before);
            const activeTasks = tasks.filter(task => task.taskState === 'Unassigned');
            if (activeTasks.length !== expectedNumberOfActiveTasks) {
                console.log(`Current task list:\n- ${tasks.map(t => t.summary()).join('\n- ')}`);
                throw new Error(`Expected to find ${expectedNumberOfActiveTasks} active task(s), but found ${activeTasks.length}`);
            }
            const activeTask = activeTasks[0];
            this.tasksFound.push(activeTask);
            await TaskService.completeTask(user, activeTask);
        }, `Waiting for ${expectedNumberOfActiveTasks} active task(s) in case ${case1_before}`);
    }
}
