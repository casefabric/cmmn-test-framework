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
     * @param expectNoFailures defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async claimTask(task: Task, user: User, expectNoFailures: boolean = true) {
        const response = await cafienneService.put('tasks/' + task.id + '/claim', user);
        return checkResponse(response, 'Task ' + task + ' was claimed succesfully, but this was not expected', expectNoFailures);
    }

    /**
     * Revokes the task on behalf of this user
     * @param task Task to revoke
     * @param user User revoking the task
     * @param expectNoFailures defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async revokeTask(task: Task, user: User, expectNoFailures: boolean = true) {
        const response = await cafienneService.put('tasks/' + task.id + '/revoke', user);
        return checkResponse(response, 'Task ' + task + ' was revoked succesfully, but this was not expected', expectNoFailures);
    }

    /**
     * Assigns the task to the specified user
     * @param task Task to assign
     * @param user User assigning the task
     * @param assignee User to which the task is assigned
     * @param expectNoFailures defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async assignTask(task: Task, user: User, assignee: User, expectNoFailures: boolean = true) {
        const response = await cafienneService.put('tasks/' + task.id + '/assign', user, { assignee: assignee.id });
        return checkResponse(response, 'Task ' + task + ' was assigned succesfully, but this was not expected', expectNoFailures);
    }

    /**
     * Delegates the task on behalf of this user
     * @param task Task to delegate
     * @param user User delegating the task
     * @param assignee User to which the task is delegated
     * @param expectNoFailures defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async delegateTask(task: Task, user: User, assignee: User, expectNoFailures: boolean = true) {
        const response = await cafienneService.put('tasks/' + task.id + '/delegate', user, { assignee: assignee.id });
        return checkResponse(response, 'Task ' + task + ' was delegated succesfully, but this was not expected', expectNoFailures);
    }

    /**
     * Completes the task on behalf of the user, with the optional task output.
     * @param task
     * @param user 
     * @param taskOutput 
     * @param expectNoFailures defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async completeTask(task: Task, user: User, taskOutput = {}, expectNoFailures: boolean = true) {
        const response = await cafienneService.post('tasks/' + task.id + '/complete', user, taskOutput);
        return checkResponse(response, 'Task ' + task + ' was completed succesfully, but this was not expected', expectNoFailures);
    }

    /**
     * Validates whether the given output is acceptable for the task.
     * @param task Task to validate output against
     * @param user User trying to validate the task output
     * @param taskOutput Task output to validate
     * @param expectNoFailures defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async validateTaskOutput(task: Task, user: User, taskOutput = {}, expectNoFailures: boolean = true) {
        const response = await cafienneService.post('tasks/' + task.id, user, taskOutput);
        const res = await checkResponse(response, 'Task output for ' + task + ' was validated succesfully, but this was not expected', expectNoFailures);
        if (expectNoFailures) {
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
     * @param expectNoFailures defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async saveTaskOutput(task: Task, user: User, taskOutput = {}, expectNoFailures: boolean = true) {
        const response = await cafienneService.put('tasks/' + task.id, user, taskOutput);
        return checkResponse(response, 'Task output for ' + task + ' was saved succesfully, but this was not expected', expectNoFailures);
    }

    /**
     * Fetches and refreshes the task information from the backend
     * Note: returns a fresh instance of Task
     * @param task
     * @param user 
     */
    async getTask(task: Task, user: User, expectNoFailures: boolean = true): Promise<Task> {
        if (!task.id) {
            console.log("Oops. First try to succesfully start a case ?!");
            return task;
        }
        const response = await cafienneService.get('tasks/' + task.id, user);
        const msg = `GetTask is not expected to succeed for user ${user.id} on task ${task.id}`;
        return await checkJSONResponse(response, msg, expectNoFailures);
    }

    /**
     * Fetches all tasks from the specified case instance from the backend
     * @param caseInstance
     * @param user 
     */
    async getCaseTasks(caseInstance: Case, user: User, expectNoFailures: boolean = true): Promise<Array<Task>> {
        const response = await cafienneService.get('/tasks/case/' + caseInstance.id, user);
        const msg = `GetCaseTasks is not expected to succeed for member ${user.id} in case ${caseInstance.id}`;
        return await checkJSONResponse(response, msg, expectNoFailures);
    }

    /**
     * Returns all tasks from case instances with the specified definition
     * @param user 
     * @param definition 
     */
    async getTasksOfCaseType(user: User, definition: string, expectNoFailures: boolean = true): Promise<Array<Task>> {
        throw new Error('Not yet implemented');
    }

    /**
     * Fetches all tasks to which the user has access, with an optional filter
     * @param user User fetching the task list
     * @param filter Optional filter for the tasks (e.g., to get only Active tasks)
     */
    async getTasks(user: User, filter?: TaskFilter, expectNoFailures: boolean = true): Promise<Array<Task>> {
        const response = await cafienneService.get('/tasks', user, filter);
        const msg = `GetTasks is not expected to succeed for member ${user.id}`;
        return await checkJSONResponse(response, msg, expectNoFailures);
    }

    /**
     * Counts the number of tasks that the user has access to.
     * Returns the count of assigned and unassigned tasks.
     * @param user 
     * @param filter 
     */
    async countTasks(user: User, filter?: TaskFilter, expectNoFailures: boolean = true): Promise<TaskCount> {
        const response = await cafienneService.get('/tasks/user/count', user, filter);
        const msg = `GetTasks is not expected to succeed for member ${user.id}`;
        return await checkJSONResponse(response, msg, expectNoFailures);
    }
}

export interface TaskCount {
    claimed: number;
    unclaimed: number;
}
