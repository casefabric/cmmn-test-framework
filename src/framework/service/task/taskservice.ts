import User from '../../user';
import CafienneService from '../cafienneservice';
import Task from '../../cmmn/task';
import Case from '../../cmmn/case';
import TaskFilter from './taskfilter';
import { checkResponse, checkJSONResponse } from '../response';

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
    async claimTask(user: User, task: Task, expectedStatusCode: number = 202) {
        const response = await cafienneService.put('tasks/' + task.id + '/claim', user);
        return checkResponse(response, `Task '${task.taskName}' with id ${task.id} was claimed succesfully, but this was not expected`, expectedStatusCode);
    }

    /**
     * Revokes the task on behalf of this user
     * @param task Task to revoke
     * @param user User revoking the task
     * @param expectedStatusCode defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async revokeTask(user: User, task: Task, expectedStatusCode: number = 202) {
        const response = await cafienneService.put('tasks/' + task.id + '/revoke', user);
        return checkResponse(response, `Task '${task.taskName}' with id ${task.id} was revoked succesfully, but this was not expected`, expectedStatusCode);
    }

    /**
     * Assigns the task to the specified user
     * @param task Task to assign
     * @param user User assigning the task
     * @param assignee User to which the task is assigned
     * @param expectedStatusCode defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async assignTask(user: User, task: Task, assignee: User, expectedStatusCode: number = 202) {
        const response = await cafienneService.put('tasks/' + task.id + '/assign', user, { assignee: assignee.id });
        return checkResponse(response, `Task '${task.taskName}' with id ${task.id} was assigned successfully, but this was not expected`, expectedStatusCode);
    }

    /**
     * Delegates the task on behalf of this user
     * @param task Task to delegate
     * @param user User delegating the task
     * @param assignee User to which the task is delegated
     * @param expectedStatusCode defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async delegateTask(user: User, task: Task, assignee: User, expectedStatusCode: number = 202) {
        const response = await cafienneService.put('tasks/' + task.id + '/delegate', user, { assignee: assignee.id });
        return checkResponse(response, `Task '${task.taskName}' with id ${task.id} was delegated succesfully, but this was not expected`, expectedStatusCode);
    }

    /**
     * Completes the task on behalf of the user, with the optional task output.
     * @param task
     * @param user 
     * @param taskOutput 
     * @param expectedStatusCode defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async completeTask(user: User, task: Task, taskOutput = {}, expectedStatusCode: number = 202) {
        const response = await cafienneService.post('tasks/' + task.id + '/complete', user, taskOutput);
        return checkResponse(response, `Task '${task.taskName}' with id ${task.id} was completed succesfully, but this was not expected`, expectedStatusCode);
    }

    /**
     * Validates whether the given output is acceptable for the task.
     * @param task Task to validate output against
     * @param user User trying to validate the task output
     * @param taskOutput Task output to validate
     * @param expectedStatusCode defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async validateTaskOutput(user: User, task: Task, taskOutput = {}, expectedStatusCode: number = 202) {
        const response = await cafienneService.post('tasks/' + task.id, user, taskOutput);
        const res = await checkResponse(response, `Task output for '${task.taskName}' with id ${task.id} was validated succesfully, but this was not expected`, expectedStatusCode);
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
    async saveTaskOutput(user: User, task: Task, taskOutput = {}, expectedStatusCode: number = 202) {
        const response = await cafienneService.put('tasks/' + task.id, user, taskOutput);
        return checkResponse(response, `Task output for '${task.taskName}' with id ${task.id} was saved succesfully, but this was not expected`, expectedStatusCode);
    }

    /**
     * Fetches and refreshes the task information from the backend
     * Note: returns a fresh instance of Task
     * @param task
     * @param user 
     */
    async getTask(user: User, task: Task | string, expectedStatusCode: number = 200): Promise<Task> {
        const taskId = (typeof(task) === 'string') ? task : task.id;
        const response = await cafienneService.get('tasks/' + taskId, user);
        const msg = `GetTask is not expected to succeed for user ${user.id} on task ${taskId}`;
        return await checkJSONResponse(response, msg, expectedStatusCode);
    }

    /**
     * Fetches all tasks from the specified case instance from the backend
     * @param caseInstance
     * @param user 
     */
    async getCaseTasks(user: User, caseInstance: Case, expectedStatusCode: number = 200): Promise<Array<Task>> {
        const response = await cafienneService.get('/tasks/case/' + caseInstance.id, user);
        const msg = `GetCaseTasks is not expected to succeed for member ${user.id} in case ${caseInstance.id}`;
        return await checkJSONResponse(response, msg, expectedStatusCode);
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
        return await checkJSONResponse(response, msg, expectedStatusCode);
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

export interface TaskCount {
    claimed: number;
    unclaimed: number;
}
