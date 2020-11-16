'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TaskService from '../../../framework/service/task/taskservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeam from '../../../framework/cmmn/caseteam';
import { CaseOwner } from '../../../framework/cmmn/caseteammember';
import Case from '../../../framework/cmmn/case';
import PlanItem from '../../../framework/cmmn/planitem';

const repositoryService = new RepositoryService();
const definition = 'taskoutputoperations.xml';

const caseService = new CaseService();
const taskService = new TaskService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestTaskOutputOperations extends TestCase {
    private caseInstance?: Case;
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const inputs = {};
        const caseTeam = new CaseTeam([new CaseOwner(user)]);

        const startCase = { tenant, definition, inputs, caseTeam, debug: true };
        this.caseInstance = await caseService.startCase(user, startCase) as Case

        await this.freshCase();
        this.printPlan();

        const addTopItem = { 
            ChildItem: {
                ChildName: 'John',
                ChildAge: 23
            }
        }
        await this.runTask('Add TopItem', addTopItem);

        await this.freshCase();
        this.printFile();

        const addTopItem2 =  { 
            ChildItem: {
                BirthDate: 25
            }
        }
        await this.runTask('Add TopItem', addTopItem2);
        await this.freshCase();
        this.printFile();

        const updateTopItem =  { 
            ChildItem: {
                BirthDate: 25
            }
        }
        await this.runTask('Update TopItem', updateTopItem);


        await this.freshCase();
        this.printFile();

        const replaceTopItem =  { 
            ChildItem: {
                BirthDate: 25
            }
        }
        await this.runTask('Replace TopItem', replaceTopItem);
        
        await this.freshCase();
        this.printPlan();
        this.printFile();

        console.log('\n\n\t\tCase ID:\t\t' + this.case().id);
    }

    async freshCase() {
        this.caseInstance = await caseService.getCase(user, this.case());
    }

    async runTask(taskName: string, output: any) {
        const tasks = await taskService.getCaseTasks(user, this.case());
        const task = tasks.find(task => {
            if (task.taskName === taskName) console.log("Found task '" + taskName +"' in state " + task.taskState)
            return task.taskName === taskName && task.taskState !== 'Completed'
        });
        if (! task) {
            throw new Error('There is no Active instance of task ' + taskName);
        }
        console.log(`Invoking ${taskName} with ${JSON.stringify(output)}`)
        await taskService.completeTask(user, task, {Out: output});
    }

    case(msg = 'Cannot get the case if it is not yet started') {
        if (!this.caseInstance) {
            throw new Error(msg);
        }
        return this.caseInstance as Case;
    }

    printCase() {
        console.log("CI: " + JSON.stringify(this.caseInstance, undefined, 2));
    }

    printFile() {
        console.log("CaseFile: " + JSON.stringify(this.case().file, undefined, 2));
    }

    printPlan() {
        console.log("Printing case plan")
        const plan = new CasePlan(this.case().planitems);
        console.log("Case plan:\n" + plan);
    }

}

class CasePlan {
    public plan: Stage;

    constructor(allPlanItems: Array<PlanItem>) {
        const plan = allPlanItems.find(item => item.type === 'CasePlan');
        if (!plan) {
            throw new Error('No CasePlan found?!');
        }

        this.plan = new Stage(plan, allPlanItems);
    }

    toString() {
        return this.plan.print('');
    }
}

class CasePlanItem {
    constructor(public item: PlanItem) {
    }

    print(indent: string): string {
        const index = this.item.index ? '.' + this.item.index : '';
        return `${indent}${this.item.type}[${this.item.id}] - ${this.item.currentState} - '${this.item.name}${index}'`;
    }
}

class Stage extends CasePlanItem {
    private items: Array<CasePlanItem> = [];

    constructor(public item: PlanItem, allItems: Array<PlanItem>) {
        super(item);
        this.items = allItems.filter(item => item.stageId === this.item.id).map(item => createItem(item, allItems));
    }

    print(indent: string): string {
        const childrenPrint = this.items.map(child => '\n' + child.print(indent + '  '));
        // const myMsg = `${indent}${this.item.type}[${this.item.name}.${this.item.index}]   id: ${this.item.id}`;
        return super.print(indent) + childrenPrint;
    }
}

function createItem(item: PlanItem, items: Array<PlanItem>) {
    if (item.type === 'Stage') {
        return new Stage(item, items);
    } else {
        return new CasePlanItem(item);
    }
}
