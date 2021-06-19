import User from '../../user';
import CafienneService from '../cafienneservice';
import Task from '../../cmmn/task';
import Case from '../../cmmn/case';
import TaskFilter from './taskfilter';
import { checkResponse, checkJSONResponse } from '../response';
import { checkCaseID } from '../case/caseservice';
import PlanItem from '../../cmmn/planitem';

const cafienneService = new CafienneService();

/**
 * Base class for invoking the Cafienne Tasks API (http://localhost:2027/tasks)
 */
export default class TaskService {
    /**
     * Claims the task on behalf of this user
     * @param task Task to claim
     * @param user User claiming the task
     * @param expectedStatusCode defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async claimTask(user: User, task: Task | PlanItem | string, expectedStatusCode: number = 202) {
        const taskId = getTaskId(task);
        const taskName = getTaskName(task);
        const response = await cafienneService.put(`tasks/${taskId}/claim`, user);
        return checkResponse(response, `Task '${taskName}' with id ${taskId} was claimed succesfully, but this was not expected`, expectedStatusCode);
    }

    /**
     * Revokes the task on behalf of this user
     * @param task Task to revoke
     * @param user User revoking the task
     * @param expectedStatusCode defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async revokeTask(user: User, task: Task | PlanItem | string, expectedStatusCode: number = 202) {
        const taskId = getTaskId(task);
        const taskName = getTaskName(task);
        const response = await cafienneService.put(`tasks/${taskId}/revoke`, user);
        return checkResponse(response, `Task '${taskName}' with id ${taskId} was revoked succesfully, but this was not expected`, expectedStatusCode);
    }

    /**
     * Assigns the task to the specified user
     * @param task Task to assign
     * @param user User assigning the task
     * @param assignee User to which the task is assigned
     * @param expectedStatusCode defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async assignTask(user: User, task: Task | PlanItem | string, assignee: User, expectedStatusCode: number = 202) {
        const taskId = getTaskId(task);
        const taskName = getTaskName(task);
        const response = await cafienneService.put(`tasks/${taskId}/assign`, user, { assignee: assignee.id });
        return checkResponse(response, `Task '${taskName}' with id ${taskId} was assigned successfully, but this was not expected`, expectedStatusCode);
    }

    /**
     * Delegates the task on behalf of this user
     * @param task Task to delegate
     * @param user User delegating the task
     * @param assignee User to which the task is delegated
     * @param expectedStatusCode defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async delegateTask(user: User, task: Task | PlanItem | string, assignee: User, expectedStatusCode: number = 202) {
        const taskId = getTaskId(task);
        const taskName = getTaskName(task);
        const response = await cafienneService.put(`tasks/${taskId}/delegate`, user, { assignee: assignee.id });
        return checkResponse(response, `Task '${taskName}' with id ${taskId} was delegated succesfully, but this was not expected`, expectedStatusCode);
    }

    /**
     * Completes the task on behalf of the user, with the optional task output.
     * @param task
     * @param user 
     * @param taskOutput 
     * @param expectedStatusCode defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async completeTask(user: User, task: Task | PlanItem | string, taskOutput = {}, expectedStatusCode: number = 202) {
        const taskId = getTaskId(task);
        const taskName = getTaskName(task);
        const response = await cafienneService.post(`tasks/${taskId}/complete`, user, taskOutput);
        return checkResponse(response, `Task '${taskName}' with id ${taskId} was completed succesfully, but this was not expected`, expectedStatusCode);
    }

    /**
     * Validates whether the given output is acceptable for the task.
     * @param task Task to validate output against
     * @param user User trying to validate the task output
     * @param taskOutput Task output to validate
     * @param expectedStatusCode defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async validateTaskOutput(user: User, task: Task | PlanItem | string, taskOutput = {}, expectedStatusCode: number = 202) {
        const taskId = getTaskId(task);
        const taskName = getTaskName(task);
        const response = await cafienneService.post(`tasks/${taskId}`, user, taskOutput);
        const res = await checkResponse(response, `Task output for '${taskName}' with id ${taskId} was validated succesfully, but this was not expected`, expectedStatusCode);
        if (response.ok) {
            const json = await response.json();
            return json;
        } else {
            const text = await response.text();
            return text;
        }
    }

    /**
     * Save the task output on behalf of the user
     * @param task Task to save the output in
     * @param user User saving the task output
     * @param taskOutput Task output to save
     * @param expectedStatusCode defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async saveTaskOutput(user: User, task: Task | PlanItem | string, taskOutput = {}, expectedStatusCode: number = 202) {
        const taskId = getTaskId(task);
        const taskName = getTaskName(task);
        const response = await cafienneService.put(`tasks/${taskId}`, user, taskOutput);
        return checkResponse(response, `Task output for '${taskName}' with id ${taskId} was saved succesfully, but this was not expected`, expectedStatusCode);
    }

    /**
     * Fetches and refreshes the task information from the backend
     * Note: returns a fresh instance of Task
     * @param task
     * @param user 
     */
    async getTask(user: User, task: Task | PlanItem | string, expectedStatusCode: number = 200): Promise<Task> {
        const taskId = getTaskId(task);
        const taskName = getTaskName(task);
        const response = await cafienneService.get(`tasks/${taskId}`, user);
        const msg = `GetTask is not expected to succeed for user ${user.id} on task ${taskId}`;
        return await checkJSONResponse(response, msg, expectedStatusCode, Task);
    }

    /**
     * Fetches all tasks from the specified case instance from the backend
     * @param Case
     * @param user 
     */
    async getCaseTasks(user: User, Case: Case | string, expectedStatusCode: number = 200): Promise<Array<Task>> {
        const caseId = checkCaseID(Case);
        const response = await cafienneService.get(`/tasks/case/${caseId}`, user);
        const msg = `GetCaseTasks is not expected to succeed for member ${user.id} in case ${caseId}`;
        return await checkJSONResponse(response, msg, expectedStatusCode, [Task]);
    }

    /**
     * Fetches all tasks from the specified case instance from the backend and searches within that list for the one that
     * matches the task parameter (either task id or task name can be given).
     * @param Case
     * @param user
     * @param task 
     */
     async getCaseTask(user: User, Case: Case | string, task: Task | PlanItem | string): Promise<Task> {
        const taskId = getTaskId(task);
        const tasks = await this.getCaseTasks(user, Case);
        const responseTask = tasks.find(task => task.id === taskId || task.taskName === taskId);
        if (! responseTask) {
            const caseId = checkCaseID(Case);
            throw new Error(`Cannot find task ${taskId} in case ${caseId}; tasks are ${tasks.map(t => t.taskName).join('\'')}`);
        } else {
            return responseTask;
        }
    }

    /**
     * Returns all tasks from case instances with the specified definition
     * @param user 
     * @param definition 
     */
    async getTasksOfCaseType(user: User, definition: string, expectedStatusCode: number = 200): Promise<Array<Task>> {
        throw new Error('Not yet implemented');
    }

    /**
     * Fetches all tasks to which the user has access, with an optional filter
     * @param user User fetching the task list
     * @param filter Optional filter for the tasks (e.g., to get only Active tasks)
     */
    async getTasks(user: User, filter?: TaskFilter, expectedStatusCode: number = 200): Promise<Array<Task>> {
        const response = await cafienneService.get('/tasks', user, filter);
        const msg = `GetTasks is not expected to succeed for member ${user.id}`;
        return await checkJSONResponse(response, msg, expectedStatusCode, [Task]);
    }

    /**
     * Counts the number of tasks that the user has access to.
     * Returns the count of assigned and unassigned tasks.
     * @param user 
     * @param filter 
     */
    async countTasks(user: User, filter?: TaskFilter, expectedStatusCode: number = 200): Promise<TaskCount> {
        const response = await cafienneService.get('/tasks/user/count', user, filter);
        const msg = `GetTasks is not expected to succeed for member ${user.id}`;
        return await checkJSONResponse(response, msg, expectedStatusCode);
    }
}

function getTaskId(task: Task | PlanItem | string) {
    return (typeof (task) === 'string') ? task : task.id;
}

function getTaskName(task: Task | PlanItem | string) {
    return (typeof (task) === 'string') ? task : task instanceof Task ? task.taskName : task.name;
}


export interface TaskCount {
    claimed: number;
    unclaimed: number;
}
