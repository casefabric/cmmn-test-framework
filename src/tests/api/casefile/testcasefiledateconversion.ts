'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import CaseFileService from '../../../service/case/casefileservice';
import CaseService from '../../../service/case/caseservice';
import TaskService from '../../../service/task/taskservice';
import TestCase from '../../../test/testcase';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';
import { findTask } from '../../../test/caseassertions/task';

const definition = Definitions.CaseFile;
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

export default class TestCaseFileDateConversion extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const startCase = { tenant, definition };
        const caseInstance = await CaseService.startCase(user, startCase);
        this.addIdentifier(caseInstance);
        
        const caseFileItem = {
            RootProperty1: "string",
            RootProperty2: true,
            ChildItem: {
                ChildName: "name",
                ChildAge: 20,
                GrandChildItem: {
                    GrandChildName: "name",
                    GrandChildBirthDate: '2001-10-26'
                }
            },
        }

        await CaseFileService.createCaseFileItem(user, caseInstance, 'RootCaseFileItem', caseFileItem);

        const tasks = await TaskService.getCaseTasks(user, caseInstance);
        const birthDayTask = findTask(tasks, 'Celebrate Birthday (Date Conversion Task)');
        console.log("Due Date: " + birthDayTask.dueDate);
        console.log("Assignee: " + birthDayTask.assignee);
    }
}
