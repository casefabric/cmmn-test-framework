import Config from '../../../config';
import Task from '../../cmmn/task';
import logger from '../../logger';
import TaskService from '../../service/task/taskservice';
import User from '../../user';
import Comparison from '../comparison';



/**
 * Asserts that the task has expected state, assignee, and owner
 * @param task 
 * @param user 
 * @param action 
 * @param expectedState 
 * @param expectedAssignee 
 * @param expectedOwner 
 */
export async function assertTask(user: User, task: Task | string, action: string, expectedState: string = '', expectedAssignee?: User, expectedOwner?: User, expectedLastModifiedBy?: User) {
    await TaskService.getTask(user, task).then(task => {
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
