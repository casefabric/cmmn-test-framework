'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TaskService from '../../../framework/service/task/taskservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import Case from '../../../framework/cmmn/case';
import Task from '../../../framework/cmmn/task';
import Comparison from '../../../framework/test/comparison';

const definition = 'taskbindingrefinement.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestTaskBindingRefinement extends TestCase {

    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const inputs = {
            CaseInput: [1, 2, 3, 4]
        };

        const startCase = { tenant, definition, inputs };
        const caseId = await CaseService.startCase(user, startCase) as Case
        const caseInstance = await CaseService.getCase(user, caseId);

        const getPlanItem = (planItemId: string) => caseInstance.planitems.find(item => item.id === planItemId);
        const tasks = await TaskService.getCaseTasks(user, caseInstance);
        tasks.sort((a: Task, b: Task) => {
            if (a.taskName < b.taskName) return -1;
            if (b.taskName < a.taskName) return 1;
            return 0;
        });
        tasks.forEach(task => {
            const item = getPlanItem(task.id);
            console.log(`Found task ${task.taskName}.${item?.index} with input ${JSON.stringify(task.input)}`);
        });

        // Validate 4 tasks 'Use Current Input'
        console.log(`Checking 'Use Current Input task(s)'`);
        const currentInputTasks = tasks.filter(task => task.taskName === 'Use Current Input');
        if (currentInputTasks.length !== inputs.CaseInput.length) {
            throw new Error(`Expecting ${inputs.CaseInput.length} tasks named 'Use Current Input', but found ${currentInputTasks.length}`);
        }
        currentInputTasks.forEach(task => {
            const expectedInput = { In: 4 };
            if (!Comparison.sameJSON(task.input, expectedInput)) {
                throw new Error(`Expected task input ${JSON.stringify(expectedInput)} but found ${JSON.stringify(task.input)}`);
            }
        });

        // Validate 4 tasks 'Use Indexed Input'
        console.log(`Checking 'Use Indexed Input task(s)'`);
        const indexedInputTasks = tasks.filter(task => task.taskName === 'Use Indexed Input');
        if (indexedInputTasks.length !== inputs.CaseInput.length) {
            throw new Error(`Expecting ${inputs.CaseInput.length} tasks named 'Use Indexed Input', but found ${indexedInputTasks.length}`);
        }
        indexedInputTasks.forEach(task => {
            const item = getPlanItem(task.id);
            if (! item) {
                throw new Error(`Cannot find plan item for task ${task.id}?! Known items: ${JSON.stringify(caseInstance.planitems)}`);
            }
            const expectedInput = { In: item.index + 1 };
            if (!Comparison.sameJSON(task.input, expectedInput)) {
                throw new Error(`Expected task input ${JSON.stringify(expectedInput)} but found ${JSON.stringify(task.input)}`);
            }
        });

        // Validate 4 tasks 'Stage Indexed Input'
        console.log(`Checking 'Stage Indexed Input task(s)'`);
        const stageIndexedInputTasks = tasks.filter(task => task.taskName === 'Stage Indexed Input');
        if (stageIndexedInputTasks.length !== inputs.CaseInput.length) {
            throw new Error(`Expecting ${inputs.CaseInput.length} tasks named 'Stage Indexed Input', but found ${stageIndexedInputTasks.length}`);
        }
        stageIndexedInputTasks.forEach(task => {
            const item = getPlanItem(task.id);
            if (! item) {
                throw new Error(`Cannot find plan item for task ${task.id}?! Known items: ${JSON.stringify(caseInstance.planitems)}`);
            }
            const stage = getPlanItem(item.stageId);
            if (! stage) {
                throw new Error(`Cannot find plan item for stage ${item.stageId}?! Known items: ${JSON.stringify(caseInstance.planitems)}`);
            }
            const expectedInput = { In: stage.index + 1 };
            if (!Comparison.sameJSON(task.input, expectedInput)) {
                throw new Error(`Expected task input ${JSON.stringify(expectedInput)} but found ${JSON.stringify(task.input)}`);
            }
        });

        // Validate 4 tasks 'Use Indexed Reference Input'
        console.log(`Checking 'Use Indexed Reference Input task(s)'`);
        const indexedReferencedTasks = tasks.filter(task => task.taskName === 'Use Indexed Reference Input');
        if (indexedReferencedTasks.length !== inputs.CaseInput.length) {
            throw new Error(`Expecting ${inputs.CaseInput.length} tasks named 'Use Indexed Reference Input', but found ${indexedReferencedTasks.length}`);
        }
        indexedReferencedTasks.forEach(task => {
            const item = getPlanItem(task.id);
            if (! item) {
                throw new Error(`Cannot find plan item for task ${task.id}?! Known items: ${JSON.stringify(caseInstance.planitems)}`);
            }
            const expectedInput = { In: `Root/CaseInput[${item.index}]` };
            if (!Comparison.sameJSON(task.input, expectedInput)) {
                throw new Error(`Expected task input ${JSON.stringify(expectedInput)} but found ${JSON.stringify(task.input)}`);
            }
        });

        // Validate 1 task 'Use List Input'
        console.log(`Checking 'Use List Input task(s)'`);
        const useListInputTasks = tasks.filter(task => task.taskName === 'Use List Input');
        if (useListInputTasks.length !== 1) {
            throw new Error(`Expecting 1 task named 'Use List Input', but found ${useListInputTasks.length}`);
        } else {
            const task = useListInputTasks[0];
            const expectedInput = { In: inputs.CaseInput };
            if (!Comparison.sameJSON(task.input, expectedInput)) {
                throw new Error(`Expected task input ${JSON.stringify(expectedInput)} but found ${JSON.stringify(task.input)}`);
            }
        }

        // Validate 1 task 'Use Reference Input'
        console.log(`Checking 'Use Reference Input task(s)'`);
        const useReferenceInputTasks = tasks.filter(task => task.taskName === 'Use Reference Input');
        if (useListInputTasks.length !== 1) {
            throw new Error(`Expecting 1 task named 'Use Reference Input', but found ${useReferenceInputTasks.length}`);
        } else {
            const task = useReferenceInputTasks[0];
            const expectedInput = { In: 'Root/CaseInput' };
            if (!Comparison.sameJSON(task.input, expectedInput)) {
                throw new Error(`Expected task input ${JSON.stringify(expectedInput)} but found ${JSON.stringify(task.input)}`);
            }
        }

        console.log(`\nCase ID:\t${caseInstance.id}\n`);
    }
}
