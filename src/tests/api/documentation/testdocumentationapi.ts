'use strict';

import Case from '../../../cmmn/case';
import CaseFileItemDocumentation from '../../../cmmn/casefileitemdocumentation';
import Definitions from '../../../cmmn/definitions/definitions';
import PlanItem from '../../../cmmn/planitem';
import CaseFileService from '../../../service/case/casefileservice';
import CasePlanService from '../../../service/case/caseplanservice';
import CaseService from '../../../service/case/caseservice';
import TestCase from '../../../test/testcase';
import { asyncForEach } from '../../../util/util';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';

const definition = Definitions.Documentation;
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

export default class TestDocumentationAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const startCase = { tenant, definition };

        const caseInstance = await CaseService.startCase(user, startCase).then(async id => CaseService.getCase(user, id));
        this.addIdentifier(caseInstance);
        
        const planItems = await CasePlanService.getPlanItems(user, caseInstance);
        console.log('Plan item summary:\n' + planItems.map(p => `- ${p.type}[${p.name}] ${p.id}`).join('\n'));

        // Check each plan item, if it has the word 'Documented' in the name, then it should have documentation, otherwise not.
        // planItems.forEach(async item => await this.assertPlanItemDocumentation(caseInstance, item));
        await asyncForEach(planItems, async item => await this.assertPlanItemDocumentation(caseInstance, item));

        await CaseFileService.getCaseFileDocumentation(user, caseInstance).then(casefileDocs => {
            this.assertCaseFileItemDocumented(casefileDocs, 'item1');
            this.assertCaseFileItemDocumented(casefileDocs, 'item1/child1');
            this.assertCaseFileItemDocumented(casefileDocs, 'item2/child2/grandchild2');
            this.assertCaseFileItemDocumented(casefileDocs, 'item2', false);
            this.assertCaseFileItemDocumented(casefileDocs, 'item2/child2', false);
        });
    }

    assertCaseFileItemDocumented(casefileDocs: Array<CaseFileItemDocumentation>, path: string, shouldExist: boolean = true) {
        if (shouldExist && !casefileDocs.find(item => item.path === path)) {
            throw new Error(`\nCaseFileDocumentation: ${JSON.stringify(casefileDocs, undefined, 2)}\n\nExpected to find documentation for case file item ${path}\n`);
        }
        if (!shouldExist && casefileDocs.find(item => item.path === path)) {
            throw new Error(`\nCaseFileDocumentation: ${JSON.stringify(casefileDocs, undefined, 2)}\n\nNot expected to find documentation for case file item ${path}\n`);
        }
    }

    async assertPlanItemDocumentation(caseId: Case | string, planItem: PlanItem) {
        await CasePlanService.getPlanItemDocumentation(user, caseId, planItem.id).then(documentation => {
            // If plan item name contains the word "Documented" then we expect to find documentation, otherwise it should be empty
            const expectedDocumentation = planItem.name.indexOf('Documented')>=0 ? planItem.name + ' Documentation' : undefined;
            const foundDocumentation = documentation ? documentation.text : undefined;
            if (foundDocumentation !== expectedDocumentation) {
                throw new Error(`Missing documentation for ${planItem.type} '${planItem.name}'.\nExpect: ${expectedDocumentation}\nFound: ${foundDocumentation}`);
            }
        });
    }
}
