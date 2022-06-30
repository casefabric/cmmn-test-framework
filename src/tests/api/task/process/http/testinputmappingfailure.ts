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
        await RepositoryService.validateAndDeploy(user, definition, tenant);
        await RepositoryService.validateAndDeploy(user, newDefinition, tenant);
        // Start mock service straight away
        await mock.start();
    }

    async run() {
        const inputs = {
            HTTPConfig : {
                port: mockPort
            }
        }

        const startCase = { tenant, definition, inputs, debug: true };

        // Starts the case with user
        const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));

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
