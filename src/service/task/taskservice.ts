import Case from '../../cmmn/case';
import PlanItem from '../../cmmn/planitem';
import Task from '../../cmmn/task';
import AsyncError from '../../infra/asyncerror';
import Trace from '../../infra/trace';
import User from '../../user';
import CafienneService from '../cafienneservice';
import { checkJSONResponse, checkResponse } from '../response';
import TaskFilter from './taskfilter';

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
    static async claimTask(user: User, task: Task | PlanItem | string, expectedStatusCode: number = 202, msg = '', trace: Trace = new Trace()) {
        const taskId = getTaskId(task);
        const taskName = getTaskName(task);
        if (!msg) {
            msg = `Task '${taskName}' with id ${taskId} was claimed succesfully, but this was not expected`;
        }
        if (! msg) {
            msg = msg;
        }
        const response = await CafienneService.put(`tasks/${taskId}/claim`, user);
        return checkResponse(response, msg, expectedStatusCode, trace);
    }

    /**
     * Revokes the task on behalf of this user
     * @param task Task to revoke
     * @param user User revoking the task
     * @param expectedStatusCode defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    static async revokeTask(user: User, task: Task | PlanItem | string, expectedStatusCode: number = 202, msg = '', trace: Trace = new Trace()) {
        const taskId = getTaskId(task);
        const taskName = getTaskName(task);
        if (!msg) {
            msg = `Task '${taskName}' with id ${taskId} was revoked succesfully, but this was not expected`;
        }
        const response = await CafienneService.put(`tasks/${taskId}/revoke`, user);
        return checkResponse(response, msg, expectedStatusCode, trace);
    }

    /**
     * Assigns the task to the specified user
     * @param task Task to assign
     * @param user User assigning the task
     * @param assignee User to which the task is assigned
     * @param expectedStatusCode defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    static async assignTask(user: User, task: Task | PlanItem | string, assignee: User, expectedStatusCode: number = 202, msg = '', trace: Trace = new Trace()) {
        const taskId = getTaskId(task);
        const taskName = getTaskName(task);
        if (! msg) {
            msg = `Task '${taskName}' with id ${taskId} was assigned successfully, but this was not expected`;
        }
        const response = await CafienneService.put(`tasks/${taskId}/assign`, user, { assignee: assignee.id });
        return checkResponse(response, msg, expectedStatusCode, trace);
    }

    /**
     * Delegates the task on behalf of this user
     * @param task Task to delegate
     * @param user User delegating the task
     * @param assignee User to which the task is delegated
     * @param expectedStatusCode defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    static async delegateTask(user: User, task: Task | PlanItem | string, assignee: User, expectedStatusCode: number = 202, msg = '', trace: Trace = new Trace()) {
        const taskId = getTaskId(task);
        const taskName = getTaskName(task);
        if (! msg) {
            msg = `Task '${taskName}' with id ${taskId} was delegated succesfully, but this was not expected`;
        }
        const response = await CafienneService.put(`tasks/${taskId}/delegate`, user, { assignee: assignee.id });
        return checkResponse(response, msg, expectedStatusCode, trace);
    }

    /**
     * Completes the task on behalf of the user, with the optional task output.
     * @param task
     * @param user 
     * @param taskOutput 
     * @param expectedStatusCode defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    static async completeTask(user: User, task: Task | PlanItem | string, taskOutput = {}, expectedStatusCode: number = 202, msg = '', trace: Trace = new Trace()) {
        const taskId = getTaskId(task);
        const taskName = getTaskName(task);
        if (! msg) {
            msg = `Task '${taskName}' with id ${taskId} was completed succesfully, but this was not expected`;
        }
        const response = await CafienneService.post(`tasks/${taskId}/complete`, user, taskOutput);
        return checkResponse(response, msg, expectedStatusCode, trace);
    }

    /**
     * Validates whether the given output is acceptable for the task.
     * @param task Task to validate output against
     * @param user User trying to validate the task output
     * @param taskOutput Task output to validate
     * @param expectedStatusCode defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    static async validateTaskOutput(user: User, task: Task | PlanItem | string, taskOutput = {}, expectedStatusCode: number = 202, msg = '', trace: Trace = new Trace()) {
        const taskId = getTaskId(task);
        const taskName = getTaskName(task);
        if (! msg) {
            msg = `Task output for '${taskName}' with id ${taskId} was validated succesfully, but this was not expected`;
        }
        const response = await CafienneService.post(`tasks/${taskId}`, user, taskOutput);
        const res = await checkResponse(response, msg, expectedStatusCode, trace);
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
    static async saveTaskOutput(user: User, task: Task | PlanItem | string, taskOutput = {}, expectedStatusCode: number = 202, msg = '', trace: Trace = new Trace()) {
        const taskId = getTaskId(task);
        const taskName = getTaskName(task);
        if (! msg) {
            msg = `Task output for '${taskName}' with id ${taskId} was saved succesfully, but this was not expected`;
        }
        const response = await CafienneService.put(`tasks/${taskId}`, user, taskOutput);
        return checkResponse(response, msg, expectedStatusCode, trace);
    }

    /**
     * Fetches and refreshes the task information from the backend
     * Note: returns a fresh instance of Task
     * @param task
     * @param user 
     */
    static async getTask(user: User, task: Task | PlanItem | string, expectedStatusCode: number = 200, msg = '', trace: Trace = new Trace()): Promise<Task> {
        const taskId = getTaskId(task);
        if (!msg) {
            msg = `GetTask is not expected to succeed for user ${user} on task ${taskId}`;
        }
        const response = await CafienneService.get(`tasks/${taskId}`, user);
        return await checkJSONResponse(response, msg, expectedStatusCode, Task, trace);
    }

    /**
     * Fetches all tasks from the specified case instance from the backend
     * @param Case
     * @param user 
     */
    static async getCaseTasks(user: User, caseId: Case | string, includeSubCaseTasks: boolean = false, expectedStatusCode: number = 200, msg = `GetCaseTasks is not expected to succeed for member ${user} in case ${caseId}`, trace: Trace = new Trace()): Promise<Array<Task>> {
        const optionalSubcaseParameter = includeSubCaseTasks ? '?includeSubCaseTasks=true' : '';
        const response = await CafienneService.get(`/tasks/case/${caseId}${optionalSubcaseParameter}`, user);
        return await checkJSONResponse(response, msg, expectedStatusCode, [Task], trace);
    }

    /**
     * Fetches all tasks from the specified case instance from the backend and searches within that list for the one that
     * matches the task parameter (either task id or task name can be given).
     * @param Case
     * @param user
     * @param task 
     */
    static async getCaseTask(user: User, caseId: Case | string, task: Task | PlanItem | string, trace: Trace = new Trace()): Promise<Task> {
        const taskId = getTaskId(task);
        const tasks = await this.getCaseTasks(user, caseId, false, undefined, undefined, trace);
        const responseTask = tasks.find(task => task.id === taskId || task.taskName === taskId);
        if (!responseTask) {
            throw new AsyncError(trace, `Cannot find task ${taskId} in case ${caseId}; tasks are ${tasks.map(t => t.taskName).join('\'')}`);
        } else {
            return responseTask;
        }
    }

    /**
     * Fetches all tasks to which the user has access, with an optional filter
     * @param user User fetching the task list
     * @param filter Optional filter for the tasks (e.g., to get only Active tasks)
     */
    static async getTasks(user: User, filter?: TaskFilter, expectedStatusCode: number = 200, msg = `GetTasks is not expected to succeed for member ${user}`, trace: Trace = new Trace()): Promise<Array<Task>> {
        const response = await CafienneService.get('/tasks', user, filter);
        return await checkJSONResponse(response, msg, expectedStatusCode, [Task], trace);
    }

    /**
     * Counts the number of tasks that the user has access to.
     * Returns the count of assigned and unassigned tasks.
     * @param user 
     * @param filter 
     */
    static async countTasks(user: User, filter?: TaskFilter, expectedStatusCode: number = 200, msg = `CountTasks is not expected to succeed for member ${user}`, trace: Trace = new Trace()): Promise<TaskCount> {
        const response = await CafienneService.get('/tasks/user/count', user, filter);
        return await checkJSONResponse(response, msg, expectedStatusCode, undefined, trace);
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
