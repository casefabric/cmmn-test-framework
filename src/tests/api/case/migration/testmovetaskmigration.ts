'use strict';

import Definitions from '../../../../cmmn/definitions/definitions';
import State from '../../../../cmmn/state';
import CaseMigrationService, { DefinitionMigration } from '../../../../service/case/casemigrationservice';
import CaseService from '../../../../service/case/caseservice';
import TaskService from '../../../../service/task/taskservice';
import { assertPlanItem } from '../../../../test/caseassertions/plan';
import TestCase from '../../../../test/testcase';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';

const base_definition = Definitions.Migration_MoveTask_v0;
const definitionMigrated = Definitions.Migration_MoveTask_v1;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestMoveTaskMigration extends TestCase {
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

        await assertPlanItem(user, caseInstance, "Task_To_Move", 0, State.Active);
        await assertPlanItem(user, caseInstance, "HumanTask_2", 0, State.Active);
        await assertPlanItem(user, caseInstance, "Stage_0", 0, State.Available);
        await TaskService.completeTask(user, taskToMove!.id);
        await TaskService.completeTask(user, task2!.id);
        await TaskService.completeTask(user, taskToDrop!.id);

        await CaseService.getCase(user, caseInstance).then(caseInstance => caseInstance.toConsole())

        console.log("Migrating case now");
        await CaseMigrationService.migrateDefinition(user, caseInstance, migratedDefinition).then(() => CaseService.getCase(user, caseInstance));

        await assertPlanItem(user, caseInstance, "NewStage", 0, State.Available);
        await assertPlanItem(user, caseInstance, "Stage_0", 0, State.Active);
        
        const task4 = await CaseService.getCase(user, caseInstance).then(caseInstance => caseInstance.toConsole()).then(c => c.planitems.find(i => i.name === 'HumanTask_4'));
        await TaskService.completeTask(user, task4!.id);

        await CaseService.getCase(user, caseInstance).then(caseInstance => caseInstance.toConsole()).then(caseInstance => {
            const movedTasks = caseInstance.planitems.filter(i => i.name === 'Task_To_Move');
            if (movedTasks.length !== 1) throw new Error(`Expected to find exactly one Task_To_Move after migration. Found ${movedTasks.length}`);
        });
    }
}
