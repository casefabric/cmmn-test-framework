import User from '../user';
import Task from '../cmmn/task';
import Comparison from './comparison';
import TaskService from '../service/task/taskservice';
import CaseService from '../service/case/caseservice';
import Case from '../../framework/cmmn/case';
import TenantUser from '../../framework/tenant/tenantuser';
import CaseFileService from '../service/case/casefileservice';
import { pathReader } from '../cmmn/casefile';
import CaseTeam from '../cmmn/caseteam';
import CaseTeamService from '../service/case/caseteamservice';

const caseService = new CaseService();
const taskService = new TaskService();
const caseFileService = new CaseFileService();
const caseTeamService = new CaseTeamService();


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
 * Finds and returns a particular task with in list of tasks
 * and throws an error if it does not exist
 * @param tasks 
 * @param taskName 
 */
export function findTask(tasks: Task[], taskName: string): Task {
    const task = tasks.find(task => task.taskName === taskName);
    if (!task) {
        throw new Error('Cannot find task ' + taskName);
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
    if(actualCount != expectedCount ) {
        throw new Error('Number of ' + state + ' tasks expected to be ' + expectedCount + '; but found ' + actualCount)
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
        // console.log("Case File for reading path " + path, casefile);
        const readCaseFileItem = (caseFile:any) => {
            const item = pathReader(caseFile, path);
            if (! item && caseFile.file) { // Temporary backwards compatibility; casefile.file will be dropped in 1.1.5
                return pathReader(caseFile.file, path)
            }
            return item;
        } 

        const actualCaseFileItem = readCaseFileItem(casefile);
        if (!Comparison.sameJSON(actualCaseFileItem, expectedContent)) {
            throw new Error(`Case File [${path}] is expected to match: ${JSON.stringify(expectedContent, undefined, 2)}\nActual: ${JSON.stringify(actualCaseFileItem, undefined, 2)}`);
        }
    });
}

/**
 * Asserts the case team with the given team
 * and throws error if it doesn't match
 * @param caseInstance 
 * @param user 
 * @param expectedTeam 
 */
export async function assertCaseTeam(caseInstance: Case, user: User, expectedTeam: CaseTeam) {
    const actualCaseTeam: CaseTeam = await caseTeamService.getCaseTeam(caseInstance, user);
    if(!Comparison.sameJSON(actualCaseTeam, expectedTeam)) {
        throw new Error('Case team is not the same as given to the case');
    }
}