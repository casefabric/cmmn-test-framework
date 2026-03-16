'use strict';

import Definitions from '../../../../cmmn/definitions/definitions';
import ModelEvent from '../../../../cmmn/event/model/modelevent';
import TaskState from '../../../../cmmn/taskstate';
import CaseService from '../../../../service/case/caseservice';
import DebugService from '../../../../service/case/debugservice';
import { assertTask } from '../../../../test/caseassertions/task';
import TestCase from '../../../../test/testcase';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';
import TimerSet from '../../../../cmmn/event/model/case/plan/timer/timerset';
import logger from '../../../../logger';

const definition = Definitions.DurationAndInstant;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestDurationAndInstant extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const duration = 'PT2M';
        const documentation = 'This is the task documentation';
        const inputs = {
            Root: {
                input1: duration
            }
        };

        const startCase = { tenant, definition, inputs };
        const caseInstance = await CaseService.startCase(user, startCase).then(async caseInstance => await CaseService.getCase(user, caseInstance));
        this.addIdentifier(caseInstance);

        const taskName = 'Duration in DueDate';
        const taskId = caseInstance.planitems.find(pi => pi.name === taskName)?.id;
        if (!taskId) {
            throw new Error(`Task '${taskName}' is not found. Probably the case definition is no longer in sync with the test code.`);
        }

        const durationTask = await assertTask(user, taskId, 'start case', TaskState.Unassigned);

        logger.info('Duration Task: ' + JSON.stringify(durationTask, undefined, 2));
        if (!durationTask) {
            throw new Error(`Task '${taskName}' not found`);
        }

        if (durationTask.taskDuration !== duration) {
            throw new Error(`Task '${taskName}' does not have the expected duration. Expected: ${duration}, Actual: ${durationTask.taskDuration}`);
        }

        if (durationTask.documentation !== documentation) {
            throw new Error(`Task '${taskName}' does not have the expected documentation. Expected: ${documentation}, Actual: ${durationTask.documentation}`);
        }

        // Now verify that the activatedOn field of the task is after the targetMoment of the timer
        const events = await DebugService.getParsedEvents(caseInstance, user);
        events.forEach(e => {
            const type = (e.constructor.name === ModelEvent.name) ? (`${e.constructor.name}[${e.engineEvent.type}]`) : e.engineEvent.type;
            console.log(`${e.offset}: ${type}`);
        });
        const timerSetEvent = events.find(event => event instanceof TimerSet) as TimerSet;
        if (!timerSetEvent) {
            throw new Error(`No TimerSet event found for case instance ${caseInstance.id}; probably the case definition is no longer in sync with the test code.`);
        }
        logger.info("Timer event: " + timerSetEvent);

        const targetMoment = new Date(timerSetEvent.targetMoment);
        const activatedOn = new Date(durationTask.activatedOn);
        console.log("Found timer target moment: " + targetMoment.toISOString());
        console.log("Found task  activatedOn:   " + activatedOn.toISOString());
        if (activatedOn < targetMoment) {
            throw new Error(`The task was activated before the target moment of the timer. Did the case model change?\n\tTarget moment: ${targetMoment.toISOString()},\n\tactivatedOn:   ${activatedOn.toISOString()}`);
        }
    }
}
