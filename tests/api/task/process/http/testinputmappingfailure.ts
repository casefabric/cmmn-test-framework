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

const mockPort = 18076;
const mock = new MockServer(mockPort);
new GetMock(mock, '/getListWebService', call => {
    const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    call.json(keys.map(key => ({ id: key })));
});


export default class TestInputMappingFailure extends TestCase {
    dashedParameterProcessTask = 'process_with_mapping_failure';
    triggerTaskEvent = 'TriggerInputMappingFailure';

    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
        await newDefinition.deploy(user, tenant);
        // Start mock service straight away
        await mock.start();
    }

    async run() {
        const inputs = {
            HTTPConfig: {
                port: mockPort
            }
        }

        const startCase = { tenant, definition, inputs, debug: true };

        // Starts the case with user
        const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));
        this.addIdentifier(caseInstance);

        await CasePlanService.raiseEvent(user, caseInstance, this.triggerTaskEvent);

        console.log(`\nCase ID:  ${caseInstance.id}`);

        await assertPlanItem(user, caseInstance, this.dashedParameterProcessTask, 0, State.Failed);

        await CasePlanService.makePlanItemTransition(user, caseInstance, this.dashedParameterProcessTask, Transition.Reactivate);

        await assertPlanItem(user, caseInstance, this.dashedParameterProcessTask, 0, State.Failed);

        await CaseMigrationService.migrateDefinition(user, caseInstance, new DefinitionMigration(newDefinition));

        await SomeTime(2000, "Waiting for update of case info");

        await assertPlanItem(user, caseInstance, this.dashedParameterProcessTask, 0, State.Failed);

        await CasePlanService.makePlanItemTransition(user, caseInstance, this.dashedParameterProcessTask, Transition.Reactivate);

        await assertPlanItem(user, caseInstance, this.dashedParameterProcessTask, 0, State.Completed);

        console.log(`\nCase ID:  ${caseInstance.id}`);

        await mock.stop();
    }
}
