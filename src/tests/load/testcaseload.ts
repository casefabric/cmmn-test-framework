'use strict';

import Definitions from "../../cmmn/definitions/definitions";
import CaseService from "../../service/case/caseservice";
import TestCase from "../../test/testcase";
import WorldWideTestTenant from "../setup/worldwidetesttenant";
import CaseFileService from "../../service/case/casefileservice";
import { PollUntilSuccess } from "../../test/time";

const definition = Definitions.CaseLoad;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestCaseLoad extends TestCase {
    lineReaderEnabled = true;
    isDefaultTest = false;

    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const startCase = { tenant, definition };
        // Sender starts the parent case
        const caseInstance = await CaseService.startCase(user, startCase).then(async ci => await CaseService.getCase(user, ci));
        this.addIdentifier(caseInstance);

        const number = this.readNumber("How many subcases must be created? \n (default is 10):  ") || 10;
        const greetings = this.createGreetings(number);
        await CaseFileService.updateCaseFileItem(user, caseInstance, 'Greeting', greetings);

        // TODO: extend the below validation to confirm that all subcases have been created.
        await PollUntilSuccess(async () => {
            await CaseService.getCase(user, caseInstance).then(ci => {
                const subcases = ci.planitems.filter(pi => pi.type === 'CaseTask');
                if (subcases.length < number) {
                    const msg = `Found only ${subcases.length} instead of expected ${number}; trying again ...`;
                    console.log(msg);
                    throw new Error(msg);
                }
            });
        });

    }

    createGreetings(number: number) {
        const greetings = [];
        while (number > 0) {
            greetings.push({ Message: `Greeting number ${number--}` })
        }
        return greetings.reverse();
    }
}
