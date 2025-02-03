'use strict';

import Definitions from '../../../../definitions/definitions';
import State from '../../../../../src/cmmn/state';
import Transition from '../../../../../src/cmmn/transition';
import GetMock from '../../../../../src/mock/getmock';
import MockServer from '../../../../../src/mock/mockserver';
import CaseMigrationService, { DefinitionMigration } from '../../../../../src/service/case/casemigrationservice';
import CasePlanService from '../../../../../src/service/case/caseplanservice';
import CaseService from '../../../../../src/service/case/caseservice';
import { assertPlanItem } from '../../../../../src/test/caseassertions/plan';
import TestCase from '../../../../../src/test/testcase';
import { SomeTime } from '../../../../../src/test/time';
import WorldWideTestTenant from '../../../../../src/tests/setup/worldwidetesttenant';

const definition = Definitions.Migration_GetList;
const newDefinition = Definitions.Migration_GetList_v1;
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
    HTTPConfig: {
        port: mockPort
    }
}

export default class TestDashedParameters extends TestCase {
    dashedParameterProcessTask = 'process_with_dashed_parameter';
    triggerTaskEvent = 'TriggerDashedParameterProcess';

    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
        await newDefinition.deploy(user, tenant);
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
