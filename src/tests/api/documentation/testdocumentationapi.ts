'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CasePlanService from '../../../framework/service/case/caseplanservice';
import PlanItem from '../../../framework/cmmn/planitem';
import Case from '../../../framework/cmmn/case';
import CaseFileService from '../../../framework/service/case/casefileservice';
import { assert } from 'console';
import CaseFileItemDocumentation from '../../../framework/cmmn/casefileitemdocumentation';

const repositoryService = new RepositoryService();
const definition = 'documentation_case.xml';

const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

const casePlanService = new CasePlanService();
const caseFileService = new CaseFileService();

export default class TestDocumentationAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const startCase = { tenant, definition };

        const caseInstance = await caseService.startCase(user, startCase);
        await caseService.getCase(user, caseInstance);
        
        const planItems = await casePlanService.getPlanItems(user, caseInstance);
        console.log('Plan item summary:\n' + planItems.map(p => `- ${p.type}[${p.name}] ${p.id}`).join('\n'));

        // Check each plan item, if it has the word 'Documented' in the name, then it should have documentation, otherwise not.
        planItems.forEach(async item => await this.assertPlanItemDocumentation(caseInstance, item));

        await caseFileService.getCaseFileDocumentation(user, caseInstance).then(casefileDocs => {
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
        await casePlanService.getPlanItemDocumentation(user, caseId, planItem.id).then(documentation => {
            // If plan item name contains the word "Documented" then we expect to find documentation, otherwise it should be empty
            const expectedDocumentation = planItem.name.indexOf('Documented')>=0 ? planItem.name + ' Documentation' : undefined;
            if (documentation.text !== expectedDocumentation) {
                throw new Error(`Missing documentation for ${planItem.type} '${planItem.name}'.\nExpect: ${expectedDocumentation}\nFound:  ${documentation.text}`);
            }
        });
    }
}
