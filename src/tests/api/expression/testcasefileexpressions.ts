'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import CaseFileService from '../../../service/case/casefileservice';
import CasePlanService from '../../../service/case/caseplanservice';
import CaseService from '../../../service/case/caseservice';
import TestCase from '../../../test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';

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
