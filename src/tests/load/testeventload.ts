'use strict';

import Definitions from "../../cmmn/definitions/definitions";
import CaseService from "../../service/case/caseservice";
import TestCase from "../../test/testcase";
import WorldWideTestTenant from "../setup/worldwidetesttenant";
import CaseFileService from "../../service/case/casefileservice";
import { PollUntilSuccess } from "../../test/time";
import CaseEvents from "../../service/storage/caseevents";
import DebugService from "../../service/case/debugservice";

const definition = Definitions.CaseLoad;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestEventLoad extends TestCase {
    lineReaderEnabled = true;
    isDefaultTest = false;

    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const number = this.readNumber("How many Response objects must be created? \n (default is 10):  ") || 10;
        let cases = this.readNumber("How many cases must be created? \n (default is 1):  ") || 1;
        const runs = [];
        while (cases > 0) {
            runs.push(this.runTest(number));
            cases--;
        }
        await Promise.all(runs);
    }

    async runTest(number: number) {
        const startCase = { tenant, definition };
        // Sender starts the parent case
        const caseInstance = await CaseService.startCase(user, startCase).then(async ci => await CaseService.getCase(user, ci));
        this.addIdentifier(caseInstance);

        const initialEvents: any[] = await DebugService.getJSONEvents(caseInstance, user);
        const initialEventNumber = initialEvents.length;
        const initialCommitEventNumber = initialEvents.filter(e => e.type === 'CaseModified').length;
        console.log(`StartCase created ${initialEvents.length} events with ${initialCommitEventNumber} commit event(s) ...`);

        const responses = this.createResponses(number);
        await CaseFileService.updateCaseFileItem(user, caseInstance, 'Response', responses);

        const events: any[] = await DebugService.getJSONEvents(caseInstance, user);
        const commitEvents = events.filter(e => e.type === 'CaseModified');

        console.log("We have " + (events.length - initialEventNumber) + " new events with " + (commitEvents.length - initialCommitEventNumber) + " new  commit event(s) ...");
        // console.log(`StartCase created ${initialEvents.length} events with ${initialCommitEventNumber} commit event(s) ...`);
    }

    createResponses(number: number) {
        const responses = [];
        while (number > 0) {
            responses.push({ Message: `Response number ${number--}` });
        }
        return responses.reverse();
    }
}
