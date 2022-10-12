'use strict';

import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import TaskService from '@cafienne/typescript-client/service/task/taskservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import WorldWideTestTenant from '../../../worldwidetesttenant';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import Comparison from '@cafienne/typescript-client/test/comparison';
import User from '@cafienne/typescript-client/user';
import Task from '@cafienne/typescript-client/cmmn/task';
import Case from '@cafienne/typescript-client/cmmn/case';
import { PollUntilSuccess } from '@cafienne/typescript-client';
import State from '@cafienne/typescript-client/cmmn/state';

const definition = 'timer.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestTimer extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const inputs = {
            duration: {
                value: 'PT2S'
            }
        };
        const startCase = { tenant, definition, inputs, debug: true };

        const caseInstance = await CaseService.startCase(user, startCase);


        await PollUntilSuccess(async () => {
            console.log(`Retrieving case ${caseInstance.id} again`)
            const latestCaseInstance = await CaseService.getCase(user, caseInstance);
            const task = latestCaseInstance.planitems.find(item => item.name === 'Task');
            const timer = latestCaseInstance.planitems.find(item => item.name === 'After duration');

            console.log(`Task ${task?.name} is in state ${task?.currentState}`)
            console.log(`Timer ${timer?.name} is in state ${timer?.currentState}`)
   
            if (timer?.currentState !== 'Completed') {
                throw new Error('Timer did not yet complete');
            }

            if (task?.currentState === State.Available.toString()) {
                throw new Error('Task should be active')
            }
        });        
    }
}
