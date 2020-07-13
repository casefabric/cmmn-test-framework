'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeam from '../../../framework/cmmn/caseteam';
import CaseTeamMember, { CaseOwner } from '../../../framework/cmmn/caseteammember';
import CaseFileService from '../../../framework/service/case/casefileservice';
import Case from '../../../framework/cmmn/case';
import User from '../../../framework/user';
import { assertGetCasesAndTasksFilter } from '../../../framework/test/assertions';

const repositoryService = new RepositoryService();
const caseService = new CaseService();
const caseFileService = new CaseFileService();
const worldwideTenant = new WorldWideTestTenant();

const definition = 'helloworld.xml';
const tenant = worldwideTenant.name;
const employee = worldwideTenant.employee;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestBusinessIdentifiers extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, sender, tenant);
    }

    async run() {
        const helloFilter = {
            filter: {
                identifiers: 'Message=hello'
            }
        };
        const toFilter = {
            filter: {
                identifiers: `To=${sender.id}`
            }
        };
        const combinedFilter = {
            filter: {
                identifiers: `Message=hello,To=${sender.id}`
            }
        };
        const inputs = {
            Greeting: {
                Message: null,
                To: sender.id,
                From: sender.id
            }
        };
        const caseTeam = new CaseTeam([new CaseOwner(employee), new CaseTeamMember(sender), new CaseTeamMember(receiver)]);
        const startCase = { tenant, definition, inputs, caseTeam, debug: true };
        const caseInstance = await caseService.startCase(startCase, sender) as Case;

        // Update case file item
        await caseFileService.updateCaseFileItem(caseInstance, sender, 'Greeting', {Message:''});

        await caseService.getCases(sender, { identifiers: 'Message=' }).then(cases =>{
            console.log(`Found ${cases.length} cases for Message filter`);
        });

        const lengthBeforeUpdate = await caseService.getCases(sender, helloFilter.filter).then(cases => {
            return cases.length;
        });

        // Update and assert filters
        await this.updateAndAssertFilter(sender, helloFilter, lengthBeforeUpdate);
        await this.updateAndAssertFilter(sender, toFilter, lengthBeforeUpdate+1);
        await this.updateAndAssertFilter(sender, combinedFilter, lengthBeforeUpdate);

        // Update case file item
        await caseFileService.updateCaseFileItem(caseInstance, sender, 'Greeting', {Message:'hello'});

        // Update and assert filters
        await this.updateAndAssertFilter(sender, helloFilter, lengthBeforeUpdate+1);
        await this.updateAndAssertFilter(sender, toFilter, lengthBeforeUpdate+1);
        await this.updateAndAssertFilter(sender, combinedFilter, lengthBeforeUpdate+1);

        // Deleted the case file item; now business identifiers must be cleared, 
        // hence less results should come.
        await caseFileService.deleteCaseFileItem(caseInstance, sender, 'Greeting');

        // Update and assert filters
        await this.updateAndAssertFilter(sender, helloFilter, lengthBeforeUpdate);
        await this.updateAndAssertFilter(sender, toFilter, lengthBeforeUpdate);
        await this.updateAndAssertFilter(sender, combinedFilter, lengthBeforeUpdate);

        return;
    }

    async updateAndAssertFilter(user: User, filter: any, expectedCount: number) {
        filter['expectedValue'] = expectedCount;
        filter['message'] = `Found mismatch in number of instances. Expected: ${expectedCount}, Found: `;
        
        // Assert getCases and getTasks against filter
        await assertGetCasesAndTasksFilter(user, filter);
    }
}