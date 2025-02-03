'use strict';

import Definitions from '../../definitions/definitions';
import CaseFileService from '../../../src/service/case/casefileservice';
import CasePlanService from '../../../src/service/case/caseplanservice';
import CaseService from '../../../src/service/case/caseservice';
import TestCase from '../../../src/test/testcase';
import WorldWideTestTenant from '../../../src/tests/setup/worldwidetesttenant';

const definition = Definitions.Expressions;
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

export default class TestCaseFileExpressions extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
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
