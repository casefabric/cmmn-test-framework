'use strict';

import Definitions from "../../../../cmmn/definitions/definitions";
import State from "../../../../cmmn/state";
import CaseFileService from "../../../../service/case/casefileservice";
import CasePlanService from "../../../../service/case/caseplanservice";
import CaseService from "../../../../service/case/caseservice";
import Path from "../../../../service/case/path";
import CaseAssertions from "../../../../test/caseassertions/caseassertions";
import TestCase from "../../../../test/testcase";
import WorldWideTestTenant from "../../../worldwidetesttenant";
import SimpleDataMock from "./simpledatamock";

const definition = Definitions.FaultHandlingSubCase;

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

const mock = new SimpleDataMock();

/**
 * This test can reactivate a task from within the model, i.e. by triggering a "reactivate-criterion"
 */
export default class TestModelBasedReactivate extends TestCase {
    async onPrepareTest() {
        await mock.start();
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const startCase = { tenant, definition, inputs: { data: mock.error_data }, debug: true };
        const caseInstance = await CaseService.startCase(user, startCase).then(id => {
            this.addIdentifier(id);
            return id;
        }).then(id => CaseService.getCase(user, id));
        caseInstance.planitems.forEach(item => {
            console.log(`- ${item.type}[${item.name}.${item.index}] | state = ${item.currentState} | transition = ${item.transition}`);
        });

        const caseTree = CaseAssertions.from(user, caseInstance);
        caseTree.assertPlanItemState('Task Failed', State.Completed);
        caseTree.assertPlanItemState('Call with Fault Handling', State.Failed);
        caseTree.assertPlanItemState('Failure Handling[0]', State.Active);

        await caseTree.runAssertions();

        const path = new Path('/Stage With Fault Handling/Failure Handling[0]/Retry/Try again');
        const tryAgain = path.resolve(caseTree.caseInstance);

        // Triggering the event to try again should lead to one more failure handling stage
        await CasePlanService.raiseEvent(user, caseInstance, '' + tryAgain?.id);
        caseTree.assertPlanItemState('Failure Handling[0]', State.Completed);
        caseTree.assertPlanItemState('Failure Handling[1]', State.Active);
        caseTree.assertPlanItemState('Call with Fault Handling', State.Failed);
        await caseTree.runAssertions();

        // Update the data to make the webservice respond with success
        await CaseFileService.updateCaseFileItem(user, caseInstance, 'data', mock.success_data);

        // Now reactivate the case plan in the top level case
        const tryAgain2 = new Path('/Stage With Fault Handling/Failure Handling[1]/Retry/Try again').resolve(caseTree.caseInstance);
        // Triggering the second instance of the event should reactivate the call
        await CasePlanService.raiseEvent(user, caseInstance, '' + tryAgain2?.id);

        // Top level case plan should still be Failed, but the call with fault handling should now be completed.
        caseTree.assertPlanItemState('faulthandling_subcase', State.Failed);
        caseTree.assertPlanItemState('Stage Without Fault Handling', State.Failed);
        caseTree.assertPlanItemState('Stage With Fault Handling', State.Completed);
        caseTree.assertPlanItemState('Stage With Fault Handling/Call with Fault Handling', State.Completed);
        caseTree.assertPlanItemState('Failure Handling[1]', State.Completed);
        caseTree.assertPlanItemState('Call with Fault Handling', State.Completed);
        await caseTree.runAssertions();
    }
}
