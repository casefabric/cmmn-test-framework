'use strict';

import State from '@cafienne/typescript-client/cmmn/state';
import Transition from '@cafienne/typescript-client/cmmn/transition';
import CaseFileService from '@cafienne/typescript-client/service/case/casefileservice';
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


export default class TestProcessTaskMigration extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
        await RepositoryService.validateAndDeploy(user, newDefinition, tenant);
    }

    async run() {
        const inputs = {
            port: 20
        }

        const startCase = { tenant, definition };

        // Starts the case with user
        const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));


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
