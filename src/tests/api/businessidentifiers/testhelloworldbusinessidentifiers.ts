'use strict';

import Case from '../../../cmmn/case';
import CaseTeam from '../../../cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from "../../../cmmn/team/caseteamuser";
import CaseFileService from '../../../service/case/casefileservice';
import CaseService from '../../../service/case/caseservice';
import RepositoryService from '../../../service/case/repositoryservice';
import TestCase from '../../../test/testcase';
import User from '../../../user';
import WorldWideTestTenant from '../../worldwidetesttenant';

const worldwideTenant = new WorldWideTestTenant();

const definition = 'helloworld.xml';
const tenant = worldwideTenant.name;
const employee = worldwideTenant.employee;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestHelloWorldBusinessIdentifiers extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(sender, definition, tenant);
    }

    async run() {
        const messageFilter = new FilterContext(sender, 'Message=');
        const helloFilter = new FilterContext(sender, 'Message=hello');
        const toFilter = new FilterContext(sender, `To=${sender.id}`);
        const combinedFilter = new FilterContext(sender, `Message=hello,To=${sender.id}`);

        const inputs = {
            Greeting: {
                Message: null,
                To: sender.id,
                From: sender.id
            }
        };

        await messageFilter.fetchInitialValue();
        await helloFilter.fetchInitialValue();
        await toFilter.fetchInitialValue();
        await combinedFilter.fetchInitialValue();

        const caseTeam = new CaseTeam([new CaseOwner(employee), new CaseTeamUser(sender), new CaseTeamUser(receiver)]);
        const startCase = { tenant, definition, inputs, caseTeam, debug: true };
        const caseInstance = await CaseService.startCase(sender, startCase);
        this.addIdentifier(caseInstance);

        // Initial input has no message in it, so there should not be any additional values
        await messageFilter.assertExtraMatches(0);

        // Update case file item
        await CaseFileService.updateCaseFileItem(sender, caseInstance, 'Greeting', { Message: '' });

        // Show that now we find a case for th message filter
        await messageFilter.assertExtraMatches(1);

        // Update and assert filters
        await helloFilter.assertExtraMatches(0);
        await toFilter.assertExtraMatches(1);
        await combinedFilter.assertExtraMatches(0);

        // Update case file item
        await CaseFileService.updateCaseFileItem(sender, caseInstance, 'Greeting', { Message: 'hello' });

        // Update and assert filters
        await helloFilter.assertExtraMatches(1);
        await toFilter.assertExtraMatches(1);
        await combinedFilter.assertExtraMatches(1);

        // Deleted the case file item; now business identifiers must be cleared, 
        // hence original results should come.
        await CaseFileService.deleteCaseFileItem(sender, caseInstance, 'Greeting');
        // Check no more extra matches
        await helloFilter.assertExtraMatches(0);
        await toFilter.assertExtraMatches(0);
        await combinedFilter.assertExtraMatches(0);
    }
}

class FilterContext {
    initialValue = 0;
    expectedValue?: number;
    filter = {
        identifiers: ''
    };

    constructor(public user: User, public identifiers: string) {
        this.filter.identifiers = identifiers;
    }

    get message(): string {
        return `Found mismatch in number of instances for filter ${this}. Expected: ${this.expectedValue}, Found: `
    }

    toString() {
        return `[${this.filter.identifiers}]`;
    }

    async fetchInitialValue() {
        await CaseService.getCases(this.user, this.filter).then(cases => {
            this.initialValue = cases.length;
            console.log(`Initial value for filter ${this} is ${this.initialValue}`);
        })
    }

    assert(cases: Array<Case>, expectedExtraMatches: number) {
        const actualValue = cases.length;
        this.expectedValue = this.initialValue + expectedExtraMatches;
        if (actualValue != this.expectedValue) {
            throw new Error(`Found ${actualValue} instead of ${this.expectedValue} cases for filter ${this}.`);
        }
    }

    async assertExtraMatches(expectedExtraMatches: number) {
        // Assert getCases against filter - it should return the initial value plus the expected extra matches
        await CaseService.getCases(this.user, this.filter).then(cases => this.assert(cases, expectedExtraMatches));
    }
}