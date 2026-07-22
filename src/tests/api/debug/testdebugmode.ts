'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import CaseService from '../../../service/case/caseservice';
import DebugService from '../../../service/case/debugservice';
import TestCase from '../../../test/testcase';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';
import ModelEvent from '../../../cmmn/event/model/modelevent';
import CaseModified from '../../../cmmn/event/model/case/casemodified';
import Case from '../../../cmmn/case';
import { DebugEvent } from '../../../cmmn/event/model/debugevent';

const definition = Definitions.HelloWorld;
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

export default class TestDebugMode extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const startCaseInput = {
            Greeting: {
                Message: 'Can you debug?',
                From: user.id
            }
        };
        const startCaseInDebugMode = { tenant, definition, inputs: startCaseInput, debug: true };
        const stats = new EventStatistics();

        // This should include a "DebugEnabled" event
        let caseInstance = await CaseService.startCase(user, startCaseInDebugMode);
        caseInstance = await CaseService.getCase(user, caseInstance);
        this.addIdentifier(caseInstance);

        await stats.check(caseInstance, stats.assertNewDebugEvent);

        // This should result in "DebugDisabled" event
        await CaseService.changeDebugMode(user, caseInstance, false);
        await stats.check(caseInstance, stats.assertNewDisabledEvent, stats.assertNoNewDebugEvent);

        // This should result in one more "DebugEnabled" event
        await CaseService.changeDebugMode(user, caseInstance, true);
        await stats.check(caseInstance, stats.assertNewEnabledEvent, stats.assertNewDebugEvent);

        // This should result in one more "DebugEvent" event
        await CaseService.getDiscretionaryItems(user, caseInstance);
        await stats.check(caseInstance, stats.assertNewDebugEvent);

        // Old code that prints contents of the DebugEvent(s)
        // await DebugService.getParsedEvents(caseInstance, user).then(events => {
        //     events.forEach((event, ix) => {
        //         // console.log("Event[" + ix + "]: " + event.engineEvent.type)
        //         if (event instanceof DebugEvent) {
        //             console.log(event.messages);
        //         }
        //     })
        // })
    }
}

function eventPrinter(events: ModelEvent[]) {
    let buffer = '';
    let index = 0;
    events.forEach((event, ix) => {
        buffer += ("\n - Event[" + ix + "]: " + event.engineEvent.type);
        if (event instanceof CaseModified) {
            buffer += '\n';
            const source = event.source;
            buffer = buffer.substring(0, index + 1) + source + '\n' + buffer.substring(index + 1);
            index = buffer.length;
        }
    })

    console.log(buffer);
}

class EventStatistics {
    numDebugEvents: number = 0;
    numEnabledEvents: number = 0;
    numDisabledEvents: number = 0;

    toString() {
        return `[numDebugEvents = ${this.numDebugEvents} | numEnabledEvents = ${this.numEnabledEvents} | numDisabledEvents = ${this.numDisabledEvents}]`;
    }

    async check(caseInstance: Case, ...pointers: Array<Function>) {
        const events = await DebugService.getParsedEvents(caseInstance, user);
        eventPrinter(events);
        console.log(`Current stats: ${this}; Applying ${pointers.map(p => p.name).join(', ')}`)
        pointers.forEach(pointer => pointer.call(this, events));
        this.numEnabledEvents = events.filter(event => event.engineEvent.type === 'DebugEnabled').length;
        this.numDisabledEvents = events.filter(event => event.engineEvent.type === 'DebugDisabled').length;
        this.numDebugEvents = events.filter(event => event.engineEvent.type === 'DebugEvent').length;
        console.log("New stats: " + this);
    }

    assertNewEnabledEvent(events: ModelEvent[]) {
        const newNum = events.filter(event => event.engineEvent.type === 'DebugEnabled').length;
        if (newNum !== this.numEnabledEvents + 1) {
            throw new Error('Missing a new DebugEnabled event')
        }
        this.numEnabledEvents = newNum;
    }

    assertNewDisabledEvent(events: ModelEvent[]) {
        const newNum = events.filter(event => event.engineEvent.type === 'DebugDisabled').length;
        if (newNum !== this.numDisabledEvents + 1) {
            throw new Error('Missing a new DebugDisabled event')
        }
        this.numDisabledEvents = newNum;
    }

    assertNewDebugEvent(events: ModelEvent[]) {
        const newNum = events.filter(event => event.engineEvent.type === 'DebugEvent').length;
        if (newNum !== (this.numDebugEvents + 1)) {
            throw new Error(`Found ${newNum} DebugEvent events, but expected ${this.numDebugEvents + 1}`);
        }
        this.numDebugEvents = newNum;
    }

    assertNoNewDebugEvent(events: ModelEvent[]) {
        const newNum = events.filter(event => event.engineEvent.type === 'DebugEvent').length;
        if (newNum !== this.numDebugEvents) {
            throw new Error(`Found ${newNum} DebugEvent events, but expected ${this.numDebugEvents}`);
        }
    }
}
