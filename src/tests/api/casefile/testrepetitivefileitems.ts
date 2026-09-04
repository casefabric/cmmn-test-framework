
'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import CaseFileService from '../../../service/case/casefileservice';
import CaseService from '../../../service/case/caseservice';
import TestCase from '../../../test/testcase';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';
import State from '../../../cmmn/state';

const definition = Definitions.RepeatCaseFileCreation;
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

export default class TestRepetitiveFileItems extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        await this.createCase();
    }

    async createCase() {
        const startCase = { tenant, definition };
        const caseInstance = await CaseService.startCase(user, startCase).then(instance => CaseService.getCase(user, instance));
        this.addIdentifier(caseInstance);

        caseInstance.assertPlanItem('Review', 0, State.Available);

        await CaseFileService.createCaseFileItem(user, caseInstance, 'TopCase', {});
        await CaseService.getCase(user, caseInstance).then(instance => {
            instance.assertPlanItem('Review', 0, State.Available);
        });

        await CaseFileService.createCaseFileItem(user, caseInstance, 'TopCase/items', []);
        await CaseService.getCase(user, caseInstance).then(instance => {
            instance.assertPlanItem('Review', 0, State.Available);
        });

        await CaseFileService.createCaseFileItem(user, caseInstance, 'TopCase/items', { item: '1' });
        await CaseService.getCase(user, caseInstance).then(instance => {
            instance.assertPlanItem('Review', 0, State.Active);
        });

        await CaseFileService.createCaseFileItem(user, caseInstance, 'TopCase/items', { item: '2' });
        await CaseService.getCase(user, caseInstance).then(instance => {
            instance.assertPlanItem('Review', 0, State.Active);
            instance.assertPlanItem('Review', 1, State.Active);
            instance.findItems('Review').length === 2 || (() => { throw new Error(`Expected 2 plan items "Review", but found ${instance.findItems('Review').length}`) })();
        });
    }
}
