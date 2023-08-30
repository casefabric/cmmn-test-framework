'use strict';

import CaseFileService from '@cafienne/typescript-client/service/case/casefileservice';
import CasePlanService from '@cafienne/typescript-client/service/case/caseplanservice';
import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';


const definition = 'expressions.xml';

const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

export default class TestCaseFileExpressions extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const startCase = { tenant, definition };
        const caseInstance = await CaseService.startCase(user, startCase);
        this.addIdentifier(caseInstance);

        await CaseFileService.createCaseFileItem(user, caseInstance, 'Item1', {});

        await CasePlanService.raiseEvent(user, caseInstance, 'Check Grandchild');
        await CasePlanService.raiseEvent(user, caseInstance, 'Check Item2');

        console.log('\n  Case ID:\t' + caseInstance.id);
    }
}
