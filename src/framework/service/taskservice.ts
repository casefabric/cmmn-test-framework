import User from '../user';
import CafienneService from './cafienneservice';
import Task from '../cmmn/task';
import CaseInstance from '../cmmn/case';


export default class TaskService {
    cafienneService = new CafienneService();
    async checkResponse(response: any, errorMsg: string, expectNoFailures: boolean) {
        if (response.ok) {
            if (! expectNoFailures) throw new Error(errorMsg);
        } else {
            if (expectNoFailures) {
                const responseText = await response.text();
                const errorMsg = response.status + ' ' + response.statusText + ': ' + responseText;
                // console.log(response.status + ' ' + response.statusText + ': ' + responseText);
                throw new Error(errorMsg);
            }
        }
        return response;
    }
    
    
    /**
     * Claims the task on behalf of this user
     * @param task 
     * @param user 
     */
    async claimTask(task: Task, user: User, expectNoFailures: boolean = true) {
        const response = await this.cafienneService.put('tasks/' + task.id + '/claim', user);
        return this.checkResponse(response, 'Task ' + task + ' was claimed succesfully, but this was not expected', expectNoFailures);
    }

    /**
     * Completes the task on behalf of the user, with the optional task output.
     * @param task
     * @param user 
     * @param taskOutput 
     * @param expectNoFailures defaults to true; if false is specified, then a failure is expected in the invocation.
     */
    async completeTask(task: Task, user: User, taskOutput = {}, expectNoFailures: boolean = true) {
        const response = await this.cafienneService.post('tasks/' + task.id + '/complete', user, taskOutput);
        return this.checkResponse(response, 'Task ' + task + ' was completed succesfully, but this was not expected', expectNoFailures);
    }

    /**
     * Fetches and refreshes the task information from the backend
     * Note: returns a fresh instance of Task
     * @param task
     * @param user 
     */
    async getTask(task: Task, user: User) {
        if (!task.id) {
            console.log("Oops. First try to succesfully start a case ?!");
            return task;
        }
        const json = await this.cafienneService.getJson('tasks/' + task.id, user);
        return new Task(json);
    }

    /**
     * Fetches all tasks from the specified case instance from the backend
     * @param caseInstance
     * @param user 
     */
    async getCaseTasks(caseInstance: CaseInstance, user: User) {
        const json = await this.cafienneService.getJson('/tasks/case/' + caseInstance.caseInstanceId, user);
        const jsonArray = <Array<any>>json;
        return jsonArray.map(task => new Task(task))
    }
}
