'use strict';

import Definitions from '../../../../cmmn/definitions/definitions';
import State from '../../../../cmmn/state';
import CaseService from '../../../../service/case/caseservice';
import TestCase from '../../../../test/testcase';
import { PollUntilSuccess } from '../../../../test/time';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';
import CaseEvents from '../../../../service/storage/caseevents';
import { assertCasePlan } from '../../../../test/caseassertions/plan';
import CaseFileService from '../../../../service/case/casefileservice';

const definition = Definitions.ComplexCase;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestTimerInSubCase extends TestCase {
    // lineReaderEnabled = true;

    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const inputs = {
            value: 'P2DT0S'
        };
        const startCase = { tenant, definition };

        const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));
        this.addIdentifier(caseInstance);

        const caseHierarchy = CaseEvents.from(user, caseInstance);
        await caseHierarchy.load();

        const getListCase = caseHierarchy.findCaseTask('getlist_getdetails')!.id;
        this.addIdentifier(getListCase);
        await assertCasePlan(user, getListCase, State.Failed);
        const timerCase = caseHierarchy.findCaseTask('timer')!.id;
        console.log("\n\nTIMER: " + timerCase);

        this.readLine(`Press enter to start test loop on ${definition} with case hierarchy\n ${caseHierarchy}`);

        await CaseFileService.updateCaseFileItem(user, getListCase, 'Timer', inputs);

        await assertCasePlan(user, timerCase, State.Active);
        await caseHierarchy.load();

        console.log("It is active with hierarchy:\n" + caseHierarchy    );
return;
        await PollUntilSuccess(async () => {
            console.log(`Retrieving case ${caseInstance.id} again`)
            const latestCaseInstance = await CaseService.getCase(user, caseInstance);
            const task = latestCaseInstance.planitems.find(item => item.name === 'Task');
            const timer = latestCaseInstance.planitems.find(item => item.name === 'After duration');

            console.log(`Task ${task?.name} is in state ${task?.currentState}`)
            console.log(`Timer ${timer?.name} is in state ${timer?.currentState}`)

            if (timer?.currentState !== 'Completed') {
                throw new Error('Timer did not yet complete');
            }

            if (task?.currentState === State.Available.toString()) {
                throw new Error('Task should be active')
            }
        });
    }
}

