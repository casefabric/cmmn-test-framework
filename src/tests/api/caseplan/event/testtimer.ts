'use strict';

import Definitions from '../../../../cmmn/definitions/definitions';
import State from '../../../../cmmn/state';
import CaseService from '../../../../service/case/caseservice';
import TestCase from '../../../../test/testcase';
import { PollUntilSuccess } from '../../../../test/time';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';

const definition = Definitions.Timer;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestTimer extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const inputs = {
            duration: {
                value: 'PT2S'
            }
        };
        const startCase = { tenant, definition, inputs, debug: true };

        const caseInstance = await CaseService.startCase(user, startCase);
        this.addIdentifier(caseInstance);

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
