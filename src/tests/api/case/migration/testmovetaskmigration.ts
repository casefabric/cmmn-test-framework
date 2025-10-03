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
import CasePlanService from '../../../../service/case/caseplanservice';
import Transition from '../../../../cmmn/transition';

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
        // Run the test both with and without recovery
        await this.runTest(true);
        await this.runTest(false);
    }

    async runTest(withRecovery: boolean) {
        const startCase = {
            tenant,
            definition: base_definition,
        };
        const migratedDefinition = new DefinitionMigration(definitionMigrated);

        // Now start running the script

        const caseInstance = await CaseService.startCase(user, startCase).then(instance => CaseService.getCase(user, instance).then(caseInstance => caseInstance.toConsole()));
        this.addIdentifier(caseInstance);

        const casePlan = await assertPlanItem(user, caseInstance, "move_task_v0", 0, State.Active);
        const taskToMove = await assertPlanItem(user, caseInstance, "Task_To_Move", 0, State.Active);
        const taskToDrop = await assertPlanItem(user, caseInstance, "Task_To_Drop", 0, State.Active);
        const task2 = await assertPlanItem(user, caseInstance, "HumanTask_2", 0, State.Active)
        const taskS3Task1 = await assertPlanItem(user, caseInstance, "S3Task1", 0, State.Active);
        const taskS3Task2 = await assertPlanItem(user, caseInstance, "S3Task2", 0, State.Active);

        const stage0 = await assertPlanItem(user, caseInstance, "Stage_0", 0, State.Available);
        const stage3 = await assertPlanItem(user, caseInstance, "Stage_3", 0, State.Active);
        const stageJustAStage = await assertPlanItem(user, caseInstance, "Just A Stage", 0, State.Active);
        await CasePlanService.makePlanItemTransition(user, caseInstance, taskToMove.id, Transition.Suspend);
        await TaskService.completeTask(user, task2!.id);
        await TaskService.completeTask(user, taskToDrop!.id);
        await TaskService.completeTask(user, taskS3Task1!.id);
        const repeatingTask = await assertPlanItem(user, caseInstance, "RepeatingTask", 0, State.Active);
        await TaskService.completeTask(user, repeatingTask.id);
        const secondRepeatingTask = await assertPlanItem(user, caseInstance, "RepeatingTask", 1, State.Active);

        await CaseService.getCase(user, caseInstance).then(caseInstance => caseInstance.toConsole());

        if (withRecovery) {
            console.log("Forcing recovery");
            await DebugService.forceRecovery(user, caseInstance);
        }

        this.readLine(`Press ENTER to migrate case ${caseInstance}`);
        await CaseMigrationService.migrateDefinition(user, caseInstance, migratedDefinition).then(() => CaseService.getCase(user, caseInstance));

        this.readLine(`Case ${caseInstance} migrated. Press ENTER to continue...`);
        await CaseService.getCase(user, caseInstance).then(caseInstance => caseInstance.toConsole())

        this.readLine(`Assert that NewStage is in state Available...`);

        await assertPlanItem(user, caseInstance, "NewStage", 0, State.Available);
        await assertPlanItem(user, caseInstance, stage0.id, 0, State.Active);
        await assertPlanItem(user, caseInstance, stage3.id, 0).then(item => {
            if (item.name !== "Stage3") {
                throw new Error(`Expected Stage_3 to have been renamed to Stage3. Found ${item.name}`);
            }

            // Should an empty stage be completed automatically? Currently not the case.
            // console.log(`Asserting that Stage3 is completed...` + JSON.stringify(item, undefined, 2));
            // if (!State.Completed.matches(item)) {
            //     throw new Error(`Expected Stage3 to be completed. Found ${item.currentState}`);
            // }
        });

        // Verify that the S3 tasks have moved
        await assertPlanItem(user, caseInstance, taskS3Task1.id, 0).then(task => {
            if (task.stageId !== casePlan.id) {
                throw new Error(`Expected S3Task1 to have been moved to CasePlan level. Found stage ${task.stageId}`);
            }
        });

        await assertPlanItem(user, caseInstance, taskS3Task2.id, 0).then(task => {
            if (task.stageId !== stage0.id) {
                throw new Error(`Expected S3Task1 to have been moved to CasePlan level. Found stage ${task.stageId}`);
            }
        });

        this.readLine(`Press ENTER to complete second repeating task...`);

        // During migration, RepeatingTask is moved to a repeating Stage, and it no longer repeats itself.
        //  Therefore, if we complete the second repeating task, there should be no third one.
        //  Rather, we should see a new one in the next iteration of the surrounding stage.
        await TaskService.completeTask(user, secondRepeatingTask.id);
        await CaseService.getCase(user, caseInstance).then(caseInstance => {
            caseInstance.toConsole();
            if (caseInstance.planitems.filter(i => i.name === 'RepeatingTask' && i.index > 1).length > 0) {
                throw new Error('Repeating task should not have been created again');
            }
        });

        // Also make sure that the RepeatingTasks have moved
        await CaseService.getCase(user, caseInstance).then(caseInstance => {
            const childrenOfJustAStage = caseInstance.planitems.filter(i => i.stageId === stageJustAStage.id && i.type !== 'Stage');
            if (childrenOfJustAStage.length !== 0) {
                caseInstance.toConsole();
                throw new Error(`Expected Just A Stage to have only stage children. Found ${childrenOfJustAStage.length} non-stage children`);
            }
        });

        if (withRecovery) {
            console.log("Forcing recovery");
            await DebugService.forceRecovery(user, caseInstance);
        }

        // Check that Task_To_Drop has been dropped and also that we now have a Milestone with this name.
        await assertPlanItem(user, caseInstance, taskToDrop.name).then(item => {
            if (item.type !== 'Milestone') {
                throw new Error(`Expected Task_To_Drop to have been dropped and replaced with a Milestone. Found state ${JSON.stringify(item, undefined, 2)}`);
            }
            // Also check that it is in a different stage
            if (item.stageId !== stage0.id) {
                throw new Error(`Expected Task_To_Drop milestone to be in Stage_0. Found ${item.stageId}`);
            }
        });
        
        await CaseService.getCase(user, caseInstance).then(caseInstance => caseInstance.toConsole());
        this.readLine(`Forced recovery. Press ENTER to continue...`);

        // Now check that the completed Task_To_Move did not trigger the LaterMilestone because HumanTask_4 has not been completed yet
        const laterMilestone = await assertPlanItem(user, caseInstance, "Later_Milestone", 0, State.Available);
        const task4 = await CaseService.getCase(user, caseInstance).then(caseInstance => caseInstance.toConsole()).then(c => c.planitems.find(i => i.name === 'HumanTask_4'));
        this.readLine(`Complete Task 4 and verify that Later_Milestone is achieved...`);
        await TaskService.completeTask(user, task4!.id);

        // Check that the milestone is still in Available state, and that HumanTask_3 has entered the game as well.
        await assertPlanItem(user, caseInstance, laterMilestone.id, 0, State.Available);
        // Also verify that HumanTask_3 is active now
        await assertPlanItem(user, caseInstance, "HumanTask_3", 0, State.Available);

        // Now resume the moved task and complete it
        await CasePlanService.makePlanItemTransition(user, caseInstance, taskToMove.id, Transition.Resume);
        await TaskService.completeTask(user, taskToMove.id);

        // Check that the milestone is achieved now.
        await assertPlanItem(user, caseInstance, laterMilestone.id, 0, State.Completed);
        // Also verify that HumanTask_3 is active now
        await assertPlanItem(user, caseInstance, "HumanTask_3", 0, State.Active);

        await CaseService.getCase(user, caseInstance).then(caseInstance => caseInstance.toConsole()).then(caseInstance => {
            const movedTasks = caseInstance.planitems.filter(i => i.name === 'Task_To_Move');
            if (movedTasks.length !== 1) throw new Error(`Expected to find exactly one Task_To_Move after migration. Found ${movedTasks.length}`);
        });

        const movedTask = await assertPlanItem(user, caseInstance, "Task_To_Move", 0, State.Completed);
        if (movedTask.id !== taskToMove.id) throw new Error(`Expected moved task to have id ${taskToMove.id}. Found ${movedTask.id}`);
        await assertPlanItem(user, caseInstance, "HumanTask_3", 0, State.Active);
    }
}
