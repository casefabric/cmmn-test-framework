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

const definition = Definitions.FaultHandlingWithEntryCriterion;

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

const mock = new SimpleDataMock();

export default class TestClassicFaultHandling extends TestCase {
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

        const firstRepeatingCall = new Path('Repeating Call[0]');
        const firstFailureHandlingStage = new Path('Failure Handling[0]');
        const firstTryAgain = new Path('Failure Handling[0]/Try Again');
        const secondRepeatingCall = new Path('Repeating Call[1]');
        const secondFailureHandlingStage = new Path('Failure Handling[1]');
        const secondTryAgain = new Path('Failure Handling[1]/Try Again');
        const thirdRepeatingCall = new Path('Repeating Call[2]');

        // Running the case should lead to a Failed task, and also to a first instance of Failure Handling with its Try Again event.
        const caseTree = CaseAssertions.from(user, caseInstance);
        caseTree.assertPlanItemState(firstRepeatingCall, State.Failed);
        caseTree.assertPlanItemState(firstFailureHandlingStage, State.Active);
        caseTree.assertPlanItemState(firstTryAgain, State.Available);
        await caseTree.runAssertions();

        // Triggering the event to try again should lead to one more failure, and one more instance of failure handling stage
        //  The first failure handling stage must be in Completed state.
        await CasePlanService.raiseEvent(user, caseInstance, '' + firstTryAgain.resolve(caseTree.caseInstance)?.id);
        caseTree.assertPlanItemState(firstRepeatingCall, State.Failed);
        caseTree.assertPlanItemState(secondRepeatingCall, State.Failed);
        caseTree.assertPlanItemState(firstFailureHandlingStage, State.Completed);
        caseTree.assertPlanItemState(firstTryAgain, State.Completed);
        caseTree.assertPlanItemState(secondFailureHandlingStage, State.Active);
        caseTree.assertPlanItemState(secondTryAgain, State.Available);
        await caseTree.runAssertions();

        // Update the data to make the webservice respond with success
        await CaseFileService.updateCaseFileItem(user, caseInstance, 'data', mock.success_data);

        // Triggering the event to try again should lead to completion, but only on the last instance of the task.
        await CasePlanService.raiseEvent(user, caseInstance, '' + secondTryAgain.resolve(caseTree.caseInstance)?.id);
        caseTree.assertPlanItemState(firstFailureHandlingStage, State.Completed);
        caseTree.assertPlanItemState(secondFailureHandlingStage, State.Completed);
        caseTree.assertPlanItemState(firstRepeatingCall, State.Failed);
        caseTree.assertPlanItemState(secondRepeatingCall, State.Failed);
        caseTree.assertPlanItemState(thirdRepeatingCall, State.Completed);
        caseTree.assertPlanItemState(firstTryAgain, State.Completed);
        caseTree.assertPlanItemState(secondTryAgain, State.Completed);
        await caseTree.runAssertions();
    }
}
