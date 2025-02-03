'use strict';

import Definitions from '../../../../definitions/definitions';
import State from '../../../../../src/cmmn/state';
import Transition from '../../../../../src/cmmn/transition';
import CaseFileService from '../../../../../src/service/case/casefileservice';
import CaseMigrationService, { DefinitionMigration } from '../../../../../src/service/case/casemigrationservice';
import CasePlanService from '../../../../../src/service/case/caseplanservice';
import CaseService from '../../../../../src/service/case/caseservice';
import { assertPlanItem } from '../../../../../src/test/caseassertions/plan';
import TestCase from '../../../../../src/test/testcase';
import WorldWideTestTenant from '../../../../../src/tests/setup/worldwidetesttenant';

const definition = Definitions.Migration_GetList;
const newDefinition = Definitions.Migration_GetList_v1;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;


export default class TestProcessTaskMigration extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
        await newDefinition.deploy(user, tenant);
    }

    async run() {
        const inputs = {
            port: 20
        }

        const startCase = { tenant, definition };

        // Starts the case with user
        const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));
        this.addIdentifier(caseInstance);

        // When the case starts, GetCasesList & GetFirstCase tasks will be in available state
        await assertPlanItem(user, caseInstance, 'GetList', 0, State.Available);

        // Create the CaseFileItem Request only with port
        await CaseFileService.createCaseFileItem(user, caseInstance, "HTTPConfig", inputs);

        // MockService is not yet started. So, GetList goes to Failed state
        await assertPlanItem(user, caseInstance, 'GetList', 0, State.Failed);

        await CaseMigrationService.migrateDefinition(user, caseInstance, new DefinitionMigration(newDefinition));

        await CasePlanService.makePlanItemTransition(user, caseInstance, 'GetList', Transition.Reactivate);

        console.log(`\nCase ID:  ${caseInstance.id}`);
    }
}
