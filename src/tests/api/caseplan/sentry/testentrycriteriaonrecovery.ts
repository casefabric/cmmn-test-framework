'use strict';

import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import WorldWideTestTenant from '../../../worldwidetesttenant';
import { assertPlanItem } from '@cafienne/typescript-client';
import State from '@cafienne/typescript-client/cmmn/state';
import TaskService from '@cafienne/typescript-client/service/task/taskservice';
import DebugService from '@cafienne/typescript-client/service/case/debugservice';

const definition = 'entrycriteriaonrecovery.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestEntryCriteriaOnRecovery extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const startCase = { tenant, definition };

        const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));
        const task1 = await assertPlanItem(user, caseInstance, 'Task1', 0, State.Active);
        const task2 = await assertPlanItem(user, caseInstance, 'Task2', 0, State.Active);
        const task3 = await assertPlanItem(user, caseInstance, 'Task3', 0, State.Available);

        // Complete first task
        await TaskService.completeTask(user, task1);

        // Take the case out of memory
        await DebugService.forceRecovery(user, caseInstance.id);

        // Bring the case back into memory
        await CaseService.getCase(user, caseInstance);

        // Complete second task
        await TaskService.completeTask(user, task2);

        await assertPlanItem(user, caseInstance, 'Task3', 0, State.Active);
    }

}
