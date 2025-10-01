'use strict';

import Definitions from '../../../../cmmn/definitions/definitions';
import State from '../../../../cmmn/state';
import CaseMigrationService, { DefinitionMigration } from '../../../../service/case/casemigrationservice';
import CaseService from '../../../../service/case/caseservice';
import TaskService from '../../../../service/task/taskservice';
import { assertPlanItem } from '../../../../test/caseassertions/plan';
import TestCase from '../../../../test/testcase';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';
import DebugService from '../../../../service/case/debugservice';

const base_definition = Definitions.Migration_MoveTask_v0;
const definitionMigrated = Definitions.Migration_MoveTask_v1;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestMoveTaskMigration extends TestCase {
    // lineReaderEnabled = true;
    async onPrepareTest() {
        await worldwideTenant.create();
        await base_definition.deploy(user, tenant);
        await definitionMigrated.deploy(user, tenant);
    }

    async run() {
        const startCase = {
            tenant,
            definition: base_definition,
        };
        const migratedDefinition = new DefinitionMigration(definitionMigrated);

        // Now start running the script

        const caseInstance = await CaseService.startCase(user, startCase).then(instance => CaseService.getCase(user, instance).then(caseInstance => caseInstance.toConsole()));
        this.addIdentifier(caseInstance);

        const taskToMove = caseInstance.planitems.find(i => i.name === 'Task_To_Move');
        const task2 = caseInstance.planitems.find(i => i.name === 'HumanTask_2');
        const taskToDrop = caseInstance.planitems.find(i => i.name === 'Task_To_Drop');
        const taskMovingUp = caseInstance.planitems.find(i => i.name === 'S3Task1');

        await assertPlanItem(user, caseInstance, "Task_To_Move", 0, State.Active);
        await assertPlanItem(user, caseInstance, "HumanTask_2", 0, State.Active);
        await assertPlanItem(user, caseInstance, "Stage_0", 0, State.Available);
        await TaskService.completeTask(user, taskToMove!.id);
        await TaskService.completeTask(user, task2!.id);
        await TaskService.completeTask(user, taskToDrop!.id);
        await TaskService.completeTask(user, taskMovingUp!.id);
        const repeatingTask = await assertPlanItem(user, caseInstance, "RepeatingTask", 0, State.Active);
        await TaskService.completeTask(user, repeatingTask!.id);

        await CaseService.getCase(user, caseInstance).then(caseInstance => caseInstance.toConsole())

        // await DebugService.forceRecovery(user, caseInstance);
        this.readLine(`Press ENTER to migrate case ${caseInstance}`);
        await CaseMigrationService.migrateDefinition(user, caseInstance, migratedDefinition).then(() => CaseService.getCase(user, caseInstance));

        this.readLine(`Case ${caseInstance} migrated. Press ENTER to continue...`);
        await CaseService.getCase(user, caseInstance).then(caseInstance => caseInstance.toConsole())

        this.readLine(`Assert that NewStage is in state Available...`);

        await assertPlanItem(user, caseInstance, "NewStage", 0, State.Available);
        await assertPlanItem(user, caseInstance, "Stage_0", 0, State.Active);
        this.readLine(`Press ENTER to complete seoncd repeating task...`);

        await assertPlanItem(user, caseInstance, "RepeatingTask", 1, State.Active).then(async task => {
            await TaskService.completeTask(user, task!.id);

        });

        // await TaskService.completeTask(user, repeatingTask!.id);

        // await DebugService.forceRecovery(user, caseInstance);
        await CaseService.getCase(user, caseInstance).then(caseInstance => caseInstance.toConsole());
        this.readLine(`Forced recovery. Press ENTER to continue...`);
        
        const task4 = await CaseService.getCase(user, caseInstance).then(caseInstance => caseInstance.toConsole()).then(c => c.planitems.find(i => i.name === 'HumanTask_4'));
        this.readLine(`Complete Task 4`);
        await TaskService.completeTask(user, task4!.id);

        await CaseService.getCase(user, caseInstance).then(caseInstance => caseInstance.toConsole()).then(caseInstance => {
            const movedTasks = caseInstance.planitems.filter(i => i.name === 'Task_To_Move');
            if (movedTasks.length !== 1) throw new Error(`Expected to find exactly one Task_To_Move after migration. Found ${movedTasks.length}`);
        });

        const movedTask = await assertPlanItem(user, caseInstance, "Task_To_Move", 0, State.Completed);
        if (movedTask.id !== taskToMove!.id) throw new Error(`Expected moved task to have id ${taskToMove!.id}. Found ${movedTask.id}`);
        await assertPlanItem(user, caseInstance, "HumanTask_3", 0, State.Active);
    }
}
