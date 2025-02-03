'use strict';

import Definitions from '../../definitions/definitions';
import CaseService from '../../../src/service/case/caseservice';
import TaskService from '../../../src/service/task/taskservice';
import TestCase from '../../../src/test/testcase';
import WorldWideTestTenant from '../../../src/tests/setup/worldwidetesttenant';

const definition = Definitions.StageTaskExpressions;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestStageTaskExpressions extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const inputs = {
            Root: {
                child: [{
                    userId: 'user1'
                }, {
                    userId: 'user2'
                }, {
                    userId: 'user3'
                }]
            }
        }
        const startCase = { tenant, definition, inputs };
        const caseInstance = await CaseService.startCase(user, startCase).then(async id => CaseService.getCase(user, id));
        this.addIdentifier(caseInstance);

        const tasks = await TaskService.getCaseTasks(user, caseInstance);
        const assignees = tasks.map(task => task.assignee);
        console.log('Assignees: ' + JSON.stringify(assignees));
        const taskItems = tasks.map(task => {
            const planitem = caseInstance.planitems.find(item => item.id === task.id);
            if (!planitem) {
                // really weird
                throw new Error(`Cannot find plan item for task ${task.taskName} with id ${task.id}`);
            }
            const stage = caseInstance.planitems.find(stage => stage.id === planitem.stageId);
            if (!stage) {
                // really weird
                throw new Error(`Cannot find stage for task ${task.taskName} with id ${planitem.stageId}`);
            }
            return { task, item: planitem, stage }
        });

        taskItems.forEach(item => console.log(`Task[${item.task.taskName}.${item.stage.index}] assigned to '${item.task.assignee}' with input ${JSON.stringify(item.task.input)}`));

        taskItems.filter(item => item.task.taskName === 'HumanTask_1').forEach(item => {
            console.log(`Task[${item.task.taskName}.${item.stage.index}] assigned to '${item.task.assignee}' with input ${JSON.stringify(item.task.input)}`)
            const task = item.task;
            const stage = item.stage;
            const assignee = 'user' + (1 + stage.index);
            if (!task.assignee.startsWith(assignee)) {
                throw new Error(`Expecting task to have assignee starting with ${assignee}, but found ${task.assignee} instead!?`);
            }
        });

        console.log('\n\n\t\tCase ID:\t\t' + caseInstance.id);
    }
}
