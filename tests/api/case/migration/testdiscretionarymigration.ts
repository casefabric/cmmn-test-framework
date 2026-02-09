'use strict';

import Case from '../../../../src/cmmn/case';
import Definitions from '../../../../src/cmmn/definitions/definitions';
import CaseMigrationService, { DefinitionMigration } from '../../../../src/service/case/casemigrationservice';
import CaseService from '../../../../src/service/case/caseservice';
import DebugService from '../../../../src/service/case/debugservice';
import TaskService from '../../../../src/service/task/taskservice';
import TestCase from '../../../../src/test/testcase';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';
import PlanItemMigrated from '../../../../src/cmmn/event/model/case/migration/planitemmigrated';

const base_definition = Definitions.Migration_Discretionary_v0;
const definitionMigrated = Definitions.Migration_Discretionary_v1;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

const TASK_1 = 'Task1';
const TASK_2 = 'Task2';
const TASK_3 = 'Task3';
const TASK_4 = 'Task4';

export default class TestDiscretionaryMigration extends TestCase {
    tasksFound: Array<string> = [];
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

        const caseInstance = await CaseService.startCase(user, startCase).then(instance => CaseService.getCase(user, instance));
        this.addIdentifier(caseInstance);

        const discretionaryItems = (await CaseService.getDiscretionaryItems(user, caseInstance)).discretionaryItems;
        const planDiscretionary = async (name: string) => {
            const item = discretionaryItems.find(item => item.name === name);
            if (!item) {
                throw new Error(`Expected a discretionary item named ${name}. Found ${discretionaryItems.length}`);
            }
            await CaseService.planDiscretionaryItem(user, caseInstance, item);
        }

        await planDiscretionary(TASK_1);
        await planDiscretionary(TASK_3);


        // Migrate caseInstance1, and then complete the task in case1
        await CaseMigrationService.migrateDefinition(user, caseInstance, migratedDefinition);


        const events = await DebugService.getParsedEvents(caseInstance);
        events.forEach(e => console.log(e.offset + ": " + e));

        const migratedPlanItems = events.filter(e => e instanceof PlanItemMigrated).map(e => (e as PlanItemMigrated).name);
        const mustContain = (name: string) => {
            if (migratedPlanItems.indexOf(name) < 0) {
                throw new Error(`Expected an event for plan item ${name}, but that was not found in the list [${migratedPlanItems.join(' - ')}]`);
            }
        }
        const shouldNotContain = (name: string) => {
            if (migratedPlanItems.indexOf(name) >= 0) {
                throw new Error(`Found an event for plan item ${name}, but that was expected]`);
            }
        }

        mustContain(TASK_1);
        mustContain(TASK_2);
        shouldNotContain(TASK_3);
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

