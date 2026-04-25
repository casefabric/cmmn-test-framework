'use strict';

import Definitions from "../../cmmn/definitions/definitions";
import CaseService from "../../service/case/caseservice";
import TestCase from "../../test/testcase";
import WorldWideTestTenant from "../setup/worldwidetesttenant";
import CaseFileService from "../../service/case/casefileservice";

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

        const line = this.readLine("How many subcases must be created? \n (default is 10):  ").trim();
        const number = Number(line).valueOf();
        if (isNaN(number)) {
            console.log("You entered a wrong type of value '" + line + "' - not creating any subcases")
        } else {
            const greetings = this.createGreetings(number);
            await CaseFileService.updateCaseFileItem(user, caseInstance, 'Greeting', greetings);
        }

        await CaseService.getCase(user, caseInstance).then(ci => ci.toConsole())
    }

    createGreetings(number: number) {
        const greetings = [];
        while (number > 0) {
            greetings.push({ Message: `Greeting number ${number--}` })
        }
        return greetings.reverse();
    }
}
