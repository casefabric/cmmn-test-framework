'use strict';

import State from "../../../cmmn/state";
import Transition from "../../../cmmn/transition";
import GetMock from "../../../mock/getmock";
import MockServer from "../../../mock/mockserver";
import CasePlanService from "../../../service/case/caseplanservice";
import CaseService from "../../../service/case/caseservice";
import RepositoryService from "../../../service/case/repositoryservice";
import { assertPlanItem } from "../../../test/caseassertions/plan";
import TestCase from "../../../test/testcase";
import { ServerSideProcessing, SomeTime } from "../../../test/time";
import WorldWideTestTenant from "../../worldwidetesttenant";

const worldwideTenant = new WorldWideTestTenant();

const definition = 'repeatstagetest.xml';
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

const mockPort = 27384;
const mock = new MockServer(mockPort);

let count = 0;

function getTimerData(index: any) {
    // const response = {
    //     TimeRetry: `P0DT0H0M${30 * count}S`
    // }
    
    const localCount = Number.parseInt(index);
    console.log(" - Count is now " + localCount)
    const response = {
        TimeRetry: `P0DT0H0M${1 + 3 * localCount}S`
    }
    console.log(" - Returning timer response with data " + response.TimeRetry)
    count ++;
    return response;
}

const pingMock = new GetMock(mock, '/getWaitTime', call => {
    // Return immediately a code 200
    const index = call.req.query.index;
    console.log(" - Getting ping["+count+"] on index " + index);
    call.json(getTimerData(index));
    call.setSyncMessage("Received ping " + index);
});

export default class TestRepeatStage extends TestCase {
    // private 
    async onPrepareTest() {
        console.log("Starting mock servive in test preparation");
        await mock.start();
        console.log("\n\n============Started mock server. Now creating tenant\n\n");
        await worldwideTenant.create();
        // Deploy the case model
        await RepositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const inputs = {
            HTTPPort: {
                port: mockPort
            }
        }

        const startCase = { tenant, definition, inputs };
        const caseInstance = await CaseService.startCase(user, startCase);
        this.addIdentifier(caseInstance);

        // Let the Status stage repeat for 3 times
        for(let i = 0; i < 3; i++) {
            console.log("\n=== Awaiting mock["+i+"]")

            const sync = await pingMock.untilCallInvoked(50000);
            console.log("=== " + sync)

            await ServerSideProcessing();
            await SomeTime(1000);

            await CaseService.getCase(user, caseInstance).then(caze => {
                console.log("Case now has " + caze.planitems.length +"  plan items");
                caze.planitems.filter(p => p.name === 'Status').forEach(s => {
                    console.log(`Status[${s.index}] is in state ${s.currentState}\thaving id: ${s.id}`)
                    // console.log("S: " + JSON.stringify(s, undefined, 2))
                })
            })

            // Status stage of index i must be completed
            await assertPlanItem(user, caseInstance, 'Status', i, State.Completed);
        }

        // Make transistion on Kill user event
        await CasePlanService.makePlanItemTransition(user, caseInstance, 'Kill', Transition.Occur);

        console.log("Case ID:\t" + caseInstance.id);
    }
}
