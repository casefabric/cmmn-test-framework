'use strict';

import { SomeTime } from '@cafienne/typescript-client';
import State from '@cafienne/typescript-client/cmmn/state';
import Transition from '@cafienne/typescript-client/cmmn/transition';
import GetMock from '@cafienne/typescript-client/mock/getmock';
import MockServer from '@cafienne/typescript-client/mock/mockserver';
import CaseMigrationService, { DefinitionMigration } from '@cafienne/typescript-client/service/case/casemigrationservice';
import CasePlanService from '@cafienne/typescript-client/service/case/caseplanservice';
import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import { assertPlanItem } from '@cafienne/typescript-client/test/caseassertions/plan';
import TestCase from '@cafienne/typescript-client/test/testcase';
import WorldWideTestTenant from '../../../../worldwidetesttenant';

const definition = 'migration/getlist.xml';
const newDefinition = 'migration/getlist_v1.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

const mockPort = 18077;
const mock = new MockServer(mockPort);
new GetMock(mock, '/getListWebService', call => {
    const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    call.json(keys.map(key => ({ id: key })));
});
const inputs = {
    HTTPConfig : {
        port: mockPort
    }
}

export default class TestDashedParameters extends TestCase {
    dashedParameterProcessTask = 'process_with_dashed_parameter';
    triggerTaskEvent = 'TriggerDashedParameterProcess';

    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
        // Start mock service straight away
        await mock.start();
    }

    async run() {
        // const caseInstanceId = 'abcde';
        const caseInstanceId = undefined;

        // In Cafienne Engine versions 1.1.19 and 1.1.20 this will create a case instance with a 
        //  process task 'process_with_dashed_parameter' that is failed
        const caseInstance = await this.createCaseInstance(caseInstanceId);

        // Note: case recovery logic is for recovering a test case that has been introduced before 
        //  Cafienne Release 1.1.21, and it can be used to recover from persistence properly
        // await this.recoverCase(caseInstanceId);

        await assertPlanItem(user, caseInstance, this.dashedParameterProcessTask, 0, State.Completed);

        console.log(`\nCase ID:  ${caseInstance.id}`);

        await mock.stop();
    }

    async createCaseInstance(caseInstanceId: string | undefined) {
        const startCase = { tenant, definition, inputs, caseInstanceId };

        const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));
        this.addIdentifier(caseInstance);

        await CasePlanService.raiseEvent(user, caseInstance, this.triggerTaskEvent);

        return caseInstance;
    }

    async recoverCase(caseInstanceId: string) {
        const caseInstance = await CaseService.getCase(user, caseInstanceId);

        await CaseMigrationService.migrateDefinition(user, caseInstance, new DefinitionMigration(newDefinition));

        await SomeTime(2000, "Waiting for update of case info");

        await assertPlanItem(user, caseInstance, this.dashedParameterProcessTask, 0, State.Failed);

        await CasePlanService.makePlanItemTransition(user, caseInstance, this.dashedParameterProcessTask, Transition.Reactivate);
    }
}
