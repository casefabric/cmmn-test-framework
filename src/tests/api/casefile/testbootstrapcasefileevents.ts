'use strict';

import Definitions from "../../../cmmn/definitions/definitions";
import CaseService from "../../../service/case/caseservice";
import TestCase from "../../../test/testcase";
import WorldWideTestTenant from "../../setup/worldwidetesttenant";
import CaseFileService from "../../../service/case/casefileservice";
import DebugService from "../../../service/case/debugservice";
import { SomeTime } from "../../../test/time";
import { assertCasePlan } from "../../../test/caseassertions/plan";

const definition = Definitions.BootstrapCaseFileEvents;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestBootstrapCaseFileEvents extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Checking whether the case decently starts',
            },
            OneMoreInput: {
                Message: 'One more message'
            }
        };

        const startCase = { tenant, definition, inputs, debug: true };
        // Sender starts the parent case
        const caseInstance = await CaseService.startCase(user, startCase);
        this.addIdentifier(caseInstance);

        console.log(`Main case id: ${caseInstance.id}`);

        const greetings = this.createGreetings(3);
        console.log("Gteetings: " + JSON.stringify(greetings, undefined, 2))

        await CaseFileService.createCaseFileItem(user, caseInstance, 'GreetingList', { Greeting: greetings });

        const handlerCase = await CaseService.getCase(user, caseInstance).then(newCase => {
            const caseTask = newCase.findItem('Greetings Handler');
            this.addIdentifier(caseTask);
            return caseTask.id;
        }).then(async id => await assertCasePlan(user, id));

        const caseTasks = handlerCase.planitems.filter(item => item.name === 'HelloWorld');
        console.log("CaseTasks:\n" + caseTasks.join("\n"))

        await SomeTime(2000);
        await Promise.all(caseTasks.map(async (subcase, index) => {
            const file = await CaseFileService.getCaseFile(user, subcase.id);
            console.log("\nCase File[" + index + "]:\t Message = " + JSON.stringify(file.Greeting.Message, undefined, 2))
        }))
    }

    createGreetings(count: number) {
        const list = [];
        while (count-- > 0) list.push({ Message: '' + count });
        return list.reverse();
    }
}
