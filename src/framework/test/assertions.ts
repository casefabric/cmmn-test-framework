import User from '../user';
import Task from '../cmmn/task';
import Comparison from './comparison';
import TaskService from '../service/task/taskservice';
import CaseService from '../service/case/caseservice';
import Case from '../../framework/cmmn/case';
import TenantUser from '../../framework/tenant/tenantuser';
import CaseFileService from '../service/case/casefileservice';
import { pathReader } from '../cmmn/casefile';

const caseService = new CaseService();
const taskService = new TaskService();
const caseFileService = new CaseFileService();


/**
 * Asserts that the task has expected state, assignee, and owner
 * @param task 
 * @param user 
 * @param action 
 * @param expectedState 
 * @param expectedAssignee 
 * @param expectedOwner 
 */
export async function assertTask(task: Task, user: User, action: string, expectedState: string = '', expectedAssignee?: User, expectedOwner?: User) {
    await taskService.getTask(task, user).then(task => {
        console.log(`Task after ${action}:\tstate = ${task.taskState},\tassignee = '${task.assignee}',\towner = '${task.owner}' `);
        if (task.taskState !== expectedState) {
            throw new Error(`Task ${task.taskName} is not in state '${expectedState}' but in state '${task.taskState}'`);
        }
        if (expectedAssignee && task.assignee !== expectedAssignee.id) {
            throw new Error(`Task ${task.taskName} is not assigned to '${expectedAssignee}' but to user '${task.assignee}'`);
        }
        if (expectedOwner && task.owner !== expectedOwner.id) {
            throw new Error(`Task ${task.taskName} is not owned by '${expectedOwner}' but by '${task.owner}'`);
        }
    });
}

/**
 * Asserts state of a plan item with the given state
 * @param caseInstance 
 * @param planItemName 
 * @param index 
 * @param user 
 * @param state 
 */
export async function assertPlanItemState(caseInstance: Case, planItemName: string, index: number, user: TenantUser, state: string) {
    // Get case details
    const freshCase = await caseService.getCase(caseInstance, user);
    const planitem = freshCase.planitems.find(p => p.name === planItemName && p.index === index);
    if (planitem?.currentState !== state) {
        throw new Error('The plan item "' + planItemName + '" is expected to be '+ state + ', but it is ' + planitem?.currentState);
    }
}

/**
 * Verifies whether task's input is same as that of expected input
 * @param task 
 * @param taskInput expected input
 */
export function verifyTaskInput(task: Task, taskInput: any) {
    if (!Comparison.sameJSON(task.input, taskInput)) {
        throw new Error('Task input is not the same as given to the case');
    }
}

/**
 * Read the case instance's case file on behalf of the user and verify that the element at the end of the path matches the expectedContent.
 * Path can be something like /Greeting/
 * 
 * @param caseInstance 
 * @param user 
 * @param path 
 * @param expectedContent 
 */
export async function assertCaseFileContent(caseInstance: Case, user: User, path: string, expectedContent: any) {
    await caseFileService.getCaseFile(caseInstance, user).then(casefile => {
        // console.log("Case File for reading path " + path, casefile.file);
        const actualCaseFileItem = pathReader(casefile.file, path);
        if (! Comparison.sameJSON(actualCaseFileItem, expectedContent)) {
            throw new Error(`Case File [${path}] is expected to match: ${JSON.stringify(expectedContent, undefined, 2)}\nActual: ${JSON.stringify(actualCaseFileItem, undefined, 2)}`);
        }
    });
}
