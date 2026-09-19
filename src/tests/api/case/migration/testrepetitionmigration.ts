'use strict';

import Case from '../../../../cmmn/case';
import Definitions from '../../../../cmmn/definitions/definitions';
import Task from '../../../../cmmn/task';
import TaskState from '../../../../cmmn/taskstate';
import CaseMigrationService, { DefinitionMigration } from '../../../../service/case/casemigrationservice';
import CaseService from '../../../../service/case/caseservice';
import DebugService from '../../../../service/case/debugservice';
import TaskService from '../../../../service/task/taskservice';
import { assertTask, assertTaskCount } from '../../../../test/caseassertions/task';
import TestCase from '../../../../test/testcase';
import { PollUntilSuccess } from '../../../../test/time';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';

const base_definition = Definitions.Migration_RepeatingTask_v0;
const definitionMigrated = Definitions.Migration_RepeatingTask_v1;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestRepetitionMigration extends TestCase {
    tasksFound: Array<Task> = [];
    firstTaskBatch: string = '';
    // lineReaderEnabled = true;

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
            inputs,
            debug: true
        };

        const migratedDefinition = new DefinitionMigration(definitionMigrated);

        // Now start running the script

        const caseInstance = await CaseService.startCase(user, startCase).then(instance => CaseService.getCase(user, instance));
        this.addIdentifier(caseInstance);

        const report = async (message: string, error: any) => {
            console.log("\n\n\n\nERROR REPORT\n\n\n\n");
            console.log(message, error);
            const events = await DebugService.getParsedEvents(caseInstance, user);
            console.log("\n\n\nEvents:", events.join('\n- '));
            console.log('\n\n');
            await CaseService.getCase(user, caseInstance).then(instance => instance.toConsole(true));
            await CaseService.getCase(user, caseInstance).then(instance => {
                console.log('\n\nHUMAN TASKS:\n');
                instance.planitems.filter(item => item.type === 'HumanTask').sort((a, b) => (a.name === b.name ? a.index < b.index : a.name < b.name) ? -1 : 1).forEach(item => console.log(`   - ${item.name}.${item.index + 1} state = ${item.currentState}`))
            });
            console.log("\n\nERROR REPORT ENDED\n\n");
            console.log(message, error);
            throw error;
        }

        try {
            await this.completeNextTask(caseInstance, 1);
            await this.completeNextTask(caseInstance, 1);
            await this.completeNextTask(caseInstance, 1);
            await this.completeNextTask(caseInstance, 1);
            await this.completeNextTask(caseInstance, 1);

            this.firstTaskBatch = this.tasksFound.map(t => t.summary()).join('\n- ');
            console.log("Completed following tasks:\n- " + this.firstTaskBatch);

        } catch (error) {
            await report("Error during task completion: ", error);
        }

        try {
            // Migrate caseInstance1, and then complete the task in case1
            this.readLine("Press enter to start the migration");
            await CaseMigrationService.migrateDefinition(user, caseInstance, migratedDefinition);
            this.readLine("Press enter to continue the test");
            await DebugService.forceRecovery(user, caseInstance);
            await this.completeNextTask(caseInstance, 2);
            console.log("First completed:\n- " + this.firstTaskBatch);
            console.log("\nTotal completed tasks:\n- " + this.tasksFound.map(t => t.summary()).join('\n- '));


        } catch (error) {
            await report("Error after migration: ", error);
        }
    }

    async completeNextTask(caseInstance: Case, expectedNumberOfActiveTasks: number) {
        return await PollUntilSuccess(async () => {
            const tasks = await TaskService.getCaseTasks(user, caseInstance);
            const activeTasks = tasks.filter(task => task.taskState === 'Unassigned');
            if (activeTasks.length !== expectedNumberOfActiveTasks) {
                console.log(`Current task list:\n- ${tasks.map(t => t.summary()).join('\n- ')}`);
                throw new Error(`Expected to find ${expectedNumberOfActiveTasks} active task(s), but found ${activeTasks.length}`);
            }
            const activeTask = activeTasks[0];
            this.tasksFound.push(activeTask);
            await TaskService.completeTask(user, activeTask);
            await assertTask(user, activeTask, "completion", TaskState.Completed)
        }, `Waiting for ${expectedNumberOfActiveTasks} active task(s) in case ${caseInstance}`);
    }
}
