'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import CaseTeam from '../../../cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from '../../../cmmn/team/caseteamuser';
import CaseService from '../../../service/case/caseservice';
import DebugService from '../../../service/case/debugservice';
import { RequestHook } from '../../../service/caseengineservice';
import CaseEngineRequest from '../../../service/request';
import TestCase from '../../../test/testcase';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';

const definition = Definitions.HelloWorld;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const employee = worldwideTenant.employee;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

class HeaderHook extends RequestHook {
    public correlationId: string = '';
    before(request: CaseEngineRequest) {
        if (this.correlationId) {
            request.headers.CorrelationId = this.correlationId;
        }
    }
}

const hook = new HeaderHook();

export default class TestCorrelationId extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(sender, tenant);
        hook.register();
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: sender.id
            }
        };
        const caseTeam = new CaseTeam([new CaseOwner(employee), new CaseTeamUser(sender), new CaseTeamUser(receiver)]);
        
        const startCase = { tenant, definition, inputs, caseTeam, debug: true };

        const taskOutput = {
            Response: {
                Message: 'Toedeledoki',
            }
        };

        hook.correlationId = 'abc-123';

        const caseInstance = await CaseService.startCase(sender, startCase).then(ci => CaseService.getCase(sender, ci.id));
        this.addIdentifier(caseInstance);
        caseInstance.toConsole();

        const events = await DebugService.getParsedEvents(caseInstance, sender).then(events => {
            // console.log("Events: " + events.map(v => v.content).map(c => JSON.stringify(c, undefined, 2)).join('\n'));
            console.log('Event.metadata.user: ' + events[0].metadata); 

            return events;
        });

        events.forEach(event => {
            console.log('Event.metadata.user: ' + event.metadata.user.id); 
            if (event.metadata.correlationId !== hook.correlationId) {
                throw new Error(`Event ${event.constructor.name} has incorrect correlationId ${event.metadata.correlationId} (expected: '${hook.correlationId}', found '${event.metadata.correlationId}')`);
            } else {
                console.log("Got the proper correlationId: " + event.metadata.correlationId);
            }
        });

        console.log(`\nCase ID: ${caseInstance.id}\n`);
    }
}
