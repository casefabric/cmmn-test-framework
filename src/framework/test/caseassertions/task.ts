import User from '../../user';
import Task from '../../cmmn/task';
import Comparison from '../comparison';
import TaskService from '../../service/task/taskservice';
import CaseService from '../../service/case/caseservice';
import Case from '../../cmmn/case';
import { SomeTime } from '../time';
import PlanItem from '../../cmmn/planitem';
import Config from '../../../config';
import logger from '../../logger';

const caseService = new CaseService();
const taskService = new TaskService();


/**
 * Asserts that the task has expected state, assignee, and owner
 * @param task 
 * @param user 
 * @param action 
 * @param expectedState 
 * @param expectedAssignee 
 * @param expectedOwner 
 */
export async function assertTask(user: User, task: Task, action: string, expectedState: string = '', expectedAssignee?: User, expectedOwner?: User, expectedLastModifiedBy?: User) {
    await taskService.getTask(user, task).then(task => {
        if (Config.TestCase.log) {
            logger.info(`Task after ${action}: state=${task.taskState}, assignee='${task.assignee}', owner='${task.owner}', modifiedBy='${task.modifiedBy}' `);
        }
        if (task.taskState !== expectedState) {
            throw new Error(`Task ${task.taskName} is not in state '${expectedState}' but in state '${task.taskState}'`);
        }
        if (expectedAssignee && task.assignee !== expectedAssignee.id) {
            throw new Error(`Task ${task.taskName} is not assigned to '${expectedAssignee}' but to user '${task.assignee}'`);
        }
        if (expectedOwner && task.owner !== expectedOwner.id) {
            throw new Error(`Task ${task.taskName} is not owned by '${expectedOwner}' but by '${task.owner}'`);
        }
        if (expectedLastModifiedBy && task.modifiedBy !== expectedLastModifiedBy.id) {
            throw new Error(`Task ${task.taskName} is not last modified by '${expectedLastModifiedBy}' but by '${task.modifiedBy}'`);
        }
    });
}

/**
 * Retrieves the plan items of the case and asserts that the plan item has the expected state.
 * Optionally runs repeated loops to await the plan item to reach the expected state.
 * Handy to use for ProcessTask and CaseTasks and their potential follow-ups, as these tasks run asynchronously in the backend.
 * @param caseId 
 * @param user 
 * @param planItemName 
 * @param planItemIndex 
 * @param expectedState 
 * @param maxAttempts 
 * @param waitTimeBetweenAttempts 
 * @returns {Promise<PlanItem>} the plan item if it is found
 * @throws {Error} if the plan item is not found after so many attempts
 */
export async function assertPlanItemState(user: User, caseId: Case | string, planItemName: string, planItemIndex: number, expectedState?: string, maxAttempts: number = 10, waitTimeBetweenAttempts = 1000): Promise<PlanItem> {
    let currentAttempt = 1;
    while (true) {
        if (Config.TestCase.log) {
            logger.info(`Running attempt ${currentAttempt} of ${maxAttempts} to find '${planItemName}.${planItemIndex}' in state ${expectedState}`);
        }
        const freshCase = await caseService.getCase(user, caseId);
        if (Config.TestCase.log) {
            logger.debug('Current Plan Items\n' + (freshCase.planitems.map(item => "- '" + item.name + "." + item.index + "' ==> '" + item.currentState + "'")).join('\n'));
        }
        const planItem = freshCase.planitems.find(p => p.name === planItemName && p.index === planItemIndex);
        if (planItem && (!expectedState || planItem.currentState === expectedState)) {
            return planItem;
        }
        if (currentAttempt >= maxAttempts) {
            break;
        }
        const currentMsg = !planItem ? 'not (yet) found in the case plan' : `in state ${planItem.currentState}`;
        await SomeTime(waitTimeBetweenAttempts, `Waiting ${waitTimeBetweenAttempts} millis before refreshing info on '${planItemName}.${planItemIndex}' to be in state ${expectedState}. The item is currently ${currentMsg}`);
        currentAttempt++;
    }
    throw new Error(`Did not find the plan item '${planItemName}.${planItemIndex}' in state ${expectedState} after ${maxAttempts} attempts`);
}

/**
 * Asserts the state of the case plan
 * @param caseId 
 * @param user 
 * @param expectedState 
 */
export async function assertCasePlanState(user: User, caseId: Case | string, expectedState?: string, maxAttempts: number = 10, waitTimeBetweenAttempts = 1000) {
    const tryGetCase = async () => {
        try {
            // Get case details
            return await caseService.getCase(user, caseId);
        } catch (error) {
            // ignore the error
        }
    }
    let currentAttempt = 1;
    while (true) {
        if (Config.TestCase.log) {
            logger.info(`Running attempt ${currentAttempt} of ${maxAttempts} to find case ${caseId} in state ${expectedState}`);
        }
        // Get case details
        const freshCase = await tryGetCase();
        if (freshCase && (!expectedState || freshCase.state === expectedState)) {
            return freshCase;
        }
        if (currentAttempt >= maxAttempts) {
            break;
        }
        const currentMsg = !freshCase ? 'not (yet) found' : `in state ${freshCase.state}`;
        await SomeTime(waitTimeBetweenAttempts, `Waiting ${waitTimeBetweenAttempts} millis before refreshing info on case ${caseId} to be in state ${expectedState}. The item is currently ${currentMsg}`);
        currentAttempt++;
    }
    throw new Error(`Did not find the case ${caseId} in state ${expectedState} after ${maxAttempts} attempts`);
}

/**
 * Verifies whether task's input is same as that of expected input
 * @param task 
 * @param taskInput expected input
 */
export function verifyTaskInput(task: Task, taskInput: any) {
    if (!Comparison.sameJSON(task.input, taskInput)) {
        throw new Error(`Input for task ${task.taskName} is not expected;\nFound:    ${JSON.stringify(task.input)}\nExpected: ${JSON.stringify(taskInput)}`);
    }
}

/**
 * Finds and returns a particular task with in list of tasks
 * and throws an error if it does not exist
 * @param tasks 
 * @param taskName 
 */
export function findTask(tasks: Task[], taskName: string): Task {
    const task = tasks.find(task => task.taskName === taskName);
    if (!task) {
        throw new Error(`Cannot find task ${taskName}`);
    }
    return task;
}

/**
 * Asserts the number of tasks that have specified state with expected count
 * @param tasks 
 * @param state 
 * @param expectedCount 
 */
export function assertTaskCount(tasks: Task[], state: string, expectedCount: Number) {
    const actualCount = tasks.filter(t => t.taskState === state).length
    if (actualCount != expectedCount) {
        throw new Error('Number of ' + state + ' tasks expected to be ' + expectedCount + '; but found ' + actualCount)
    }
}
