import User from '../user';
import CafienneService from './cafienneservice';
import Task from '../cmmn/task';

export default class TaskService {
    cafienneService = new CafienneService();

    async claim(task: Task, user: User) {
        const response = await this.cafienneService.put(task.getURL() + '/claim', {}, user);
        if (response.ok)
            console.log("Wauw. We claimed the task");
        else {
            console.log("Could nto cliam task ", response);
        }
        return this;
    }


    async complete(task: Task, user: User, taskOutput = {}) {
        const response = await this.cafienneService.post(task.getURL() + '/complete', taskOutput, user);
        if (response.ok)
            console.log("Completed task");
        else
            console.log("Failed to comppelte task: ", response);
        return task;
    }

    async getTask(task: Task, user: User) {
        if (!task.id) {
            console.log("Oops. First try to succesfully start a case ?!");
            return task;
        }
        const json = await this.cafienneService.get(task.getURL(), user);
        return task.fillFromJson(json);
    }
}
