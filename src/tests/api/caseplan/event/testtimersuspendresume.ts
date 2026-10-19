'use strict';

import Case from '../../../../cmmn/case';
import Definitions from '../../../../cmmn/definitions/definitions';
import TimerResumed from '../../../../cmmn/event/model/case/plan/timer/timerresumed';
import TimerSet from '../../../../cmmn/event/model/case/plan/timer/timerset';
import State from '../../../../cmmn/state';
import Transition from '../../../../cmmn/transition';
import CaseHistoryService from '../../../../service/case/casehistoryservice';
import CasePlanService from '../../../../service/case/caseplanservice';
import CaseService from '../../../../service/case/caseservice';
import DebugService from '../../../../service/case/debugservice';
import TestCase from '../../../../test/testcase';
import { PollUntilSuccess, SomeTime } from '../../../../test/time';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';

const definition = Definitions.Timer;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

const timerName = 'After duration';
const taskName = 'Task';

// Margin for the time the engine needs to raise a timer and process the resulting events.
const tolerance = 2000;

interface Scenario {
    name: string;
    // Timer expression; either an ISO 8601 duration or an ISO 8601 moment in time.
    timerExpression: () => string;
    // Time in milliseconds that the case plan stays suspended.
    suspension: number;
    // When the timer should go off.
    //  'reactivation' - its original moment passed during the suspension, so it should go off right after reactivation.
    //  'target'       - the suspension ended before its original moment, so it should go off at that moment.
    expectedFiring: 'reactivation' | 'target';
}

/**
 * A suspended case plan pauses its timers. Upon reactivation a timer must keep the moment
 * that was determined when the timer was created, both for timers with a duration and for timers with a fixed moment.
 *  - If that moment passed during the suspension, the timer goes off right after reactivation, and only once.
 *  - If the suspension ends before that moment, the timer goes off at that moment.
 */
export default class TestTimerSuspendResume extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const scenarios: Scenario[] = [{
            name: 'A - duration timer that comes due while suspended',
            timerExpression: () => 'PT3S',
            suspension: 6000,
            expectedFiring: 'reactivation'
        }, {
            name: 'B - duration timer, suspension ends before it is due',
            timerExpression: () => 'PT8S',
            suspension: 3000,
            expectedFiring: 'target'
        }, {
            name: 'C - fixed moment that passes while suspended',
            timerExpression: () => new Date(Date.now() + 3000).toISOString(),
            suspension: 6000,
            expectedFiring: 'reactivation'
        }, {
            name: 'D - fixed moment, suspension ends before it',
            timerExpression: () => new Date(Date.now() + 8000).toISOString(),
            suspension: 3000,
            expectedFiring: 'target'
        }];

        // Run the scenarios in parallel, each in its own case, to keep the test duration acceptable.
        //  All scenarios run to the end, so that a failure reports each failing scenario instead of only the first one.
        const failures: string[] = [];
        await Promise.all(scenarios.map(scenario => this.runScenario(scenario).catch(error => {
            failures.push(error instanceof Error ? error.message : `${error}`);
        })));
        if (failures.length > 0) {
            throw new Error(`${failures.length} of ${scenarios.length} timer scenarios failed:\n\n${failures.join('\n\n')}`);
        }
    }

    async runScenario(scenario: Scenario) {
        const inputs = { duration: { value: scenario.timerExpression() } };
        const startCase = { tenant, definition, inputs, debug: true };
        const caseInstance = await CaseService.startCase(user, startCase).then(id => {
            this.addIdentifier(id);
            return id;
        }).then(id => CaseService.getCase(user, id));
        console.log(`${scenario.name}: running in case ${caseInstance.id}`);

        await CasePlanService.makePlanItemTransition(user, caseInstance, caseInstance.plan.id, Transition.Suspend);
        await SomeTime(scenario.suspension, `${scenario.name}: keeping the case plan suspended for ${scenario.suspension} milliseconds`);
        await CasePlanService.makePlanItemTransition(user, caseInstance, caseInstance.plan.id, Transition.Reactivate);

        // Wait until the timer has gone off and the task is started.
        const finalCase = await PollUntilSuccess(async () => {
            const latestCaseInstance = await CaseService.getCase(user, caseInstance);
            const timer = findPlanItem(latestCaseInstance, timerName);
            const task = findPlanItem(latestCaseInstance, taskName);
            if (timer.currentState !== State.Completed.toString()) {
                throw new Error(`${scenario.name}: timer did not yet complete`);
            }
            if (task.currentState !== State.Active.toString()) {
                throw new Error(`${scenario.name}: task should be active`);
            }
            return latestCaseInstance;
        });

        const timer = findPlanItem(finalCase, timerName);
        const timerHistory = await CaseHistoryService.getPlanItemHistory(user, caseInstance, timer.id);
        const casePlanHistory = await CaseHistoryService.getPlanItemHistory(user, caseInstance, caseInstance.plan.id);

        // The suspension of the case plan must have reached the timer, otherwise the scenario tests nothing.
        if (!timerHistory.find(item => Transition.ParentSuspend.is(item.transition))) {
            throw new Error(`${scenario.name}: the timer was not suspended along with the case plan`);
        }

        // The timer must go off exactly once.
        const occurrences = timerHistory.filter(item => Transition.Occur.is(item.transition));
        if (occurrences.length !== 1) {
            throw new Error(`${scenario.name}: expected the timer to occur exactly once, but it occurred ${occurrences.length} times`);
        }

        const reactivation = casePlanHistory.find(item => Transition.Reactivate.is(item.transition));
        if (!reactivation) {
            throw new Error(`${scenario.name}: could not find the reactivation of the case plan`);
        }

        // Resuming the timer must keep the moment that was determined when the timer was created.
        const events = await DebugService.getParsedEvents(caseInstance, user);
        const timerSet = events.find(event => event.constructor === TimerSet) as TimerSet;
        const timerResumed = events.filter(event => event.constructor === TimerResumed) as TimerResumed[];
        if (!timerSet) {
            throw new Error(`${scenario.name}: no TimerSet event found; probably the case definition is no longer in sync with the test code.`);
        }
        if (timerResumed.length === 0) {
            throw new Error(`${scenario.name}: no TimerResumed event found`);
        }
        const targetMoment = new Date(timerSet.targetMoment);
        const firedAt = new Date(occurrences[0].lastModified);
        const reactivatedAt = new Date(reactivation.lastModified);
        console.log(`${scenario.name}:\n\ttarget moment: ${targetMoment.toISOString()}\n\treactivated:   ${reactivatedAt.toISOString()}\n\tfired:         ${firedAt.toISOString()}`);

        timerResumed.forEach(resumed => {
            if (new Date(resumed.targetMoment).getTime() !== targetMoment.getTime()) {
                throw new Error(`${scenario.name}: the timer changed its moment upon resume.\n\tTimerSet:     ${timerSet.targetMoment}\n\tTimerResumed: ${resumed.targetMoment}\n\tReactivated:  ${reactivatedAt.toISOString()}\n\tFired:        ${firedAt.toISOString()}`);
            }
        });

        // Nothing may fire while the case plan is suspended.
        if (firedAt < reactivatedAt) {
            throw new Error(`${scenario.name}: the timer went off at ${firedAt.toISOString()}, while the case plan was still suspended (reactivated at ${reactivatedAt.toISOString()})`);
        }

        if (scenario.expectedFiring === 'reactivation') {
            if (targetMoment > reactivatedAt) {
                throw new Error(`${scenario.name}: the target moment ${targetMoment.toISOString()} did not pass during the suspension; the scenario needs a longer suspension`);
            }
            if (firedAt.getTime() - reactivatedAt.getTime() > tolerance) {
                throw new Error(`${scenario.name}: the timer should go off right after reactivation (${reactivatedAt.toISOString()}), but it went off at ${firedAt.toISOString()}`);
            }
        } else {
            if (targetMoment < reactivatedAt) {
                throw new Error(`${scenario.name}: the target moment ${targetMoment.toISOString()} passed during the suspension; the scenario needs a shorter suspension`);
            }
            if (firedAt < targetMoment || firedAt.getTime() - targetMoment.getTime() > tolerance) {
                throw new Error(`${scenario.name}: the timer should go off at its target moment ${targetMoment.toISOString()}, but it went off at ${firedAt.toISOString()}`);
            }
        }
    }
}

function findPlanItem(caseInstance: Case, name: string) {
    const item = caseInstance.planitems.find(item => item.name === name);
    if (!item) {
        throw new Error(`Plan item '${name}' is not found. Probably the case definition is no longer in sync with the test code.`);
    }
    return item;
}
