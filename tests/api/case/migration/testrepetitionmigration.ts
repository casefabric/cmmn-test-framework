'use strict';

import Case from '../../../../src/cmmn/case';
import Definitions from '../../../definitions/definitions';
import CaseMigrationService, { DefinitionMigration } from '../../../../src/service/case/casemigrationservice';
import CaseService from '../../../../src/service/case/caseservice';
import DebugService from '../../../../src/service/case/debugservice';
import TaskService from '../../../../src/service/task/taskservice';
import TestCase from '../../../../src/test/testcase';
import { SomeTime } from '../../../../src/test/time';
import WorldWideTestTenant from '../../../../src/tests/setup/worldwidetesttenant';

const base_definition = Definitions.Migration_RepeatingTask_v0;
const definitionMigrated = Definitions.Migration_RepeatingTask_v1;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestRepetitionMigration extends TestCase {
    tasksFound: Array<string> = [];
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

        const firstTaskBatch = this.tasksFound.join('\n- ');
        console.log("Completed following tasks: " + firstTaskBatch);

        await SomeTime(1000, 'Awaiting 1 second before case migration')

        // Migrate caseInstance1, and then complete the task in case1
        await CaseMigrationService.migrateDefinition(user, caseInstance, migratedDefinition);
        await DebugService.forceRecovery(user, caseInstance);
        await this.completeNextTask(caseInstance, 2);
        console.log("First completed: " + firstTaskBatch);
        console.log("\nTotal completed tasks: " + this.tasksFound.join('\n- '));
    }

    async completeNextTask(case1_before: Case, expectedNumberOfActiveTasks: number) {
        const tasks = await TaskService.getCaseTasks(user, case1_before);
        const activeTasks = tasks.filter(task => task.taskState === 'Unassigned');
        if (activeTasks.length !== expectedNumberOfActiveTasks) {
            throw new Error(`Expected to find ${expectedNumberOfActiveTasks} active task(s), but found ${activeTasks.length}`);
        }
        const activeTask = activeTasks[0];
        this.tasksFound.push(activeTask.taskName);
        await TaskService.completeTask(user, activeTask);
    }
}
