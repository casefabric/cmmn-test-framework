'use strict';

import CaseService from '../../../../framework/service/case/caseservice';
import TestCase from '../../../../framework/test/testcase';
import WorldWideTestTenant from '../../../worldwidetesttenant';
import RepositoryService from '../../../../framework/service/case/repositoryservice';
import Case from '../../../../framework/cmmn/case';
import { assertPlanItemState } from '../../../../framework/test/assertions';
import DebugService from '../../../../framework/service/case/debugservice';
import CaseFileService from '../../../../framework/service/case/casefileservice';

const repositoryService = new RepositoryService();
const definition = 'calculation.xml';

const caseService = new CaseService();
const caseFileService = new CaseFileService();
const debugService = new DebugService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestCalculation extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        await this.runStep(2);
        await this.runStep(1);
    }

    async runStep(nr: number) {
        const inputs = {
            Root: {
                input1: {
                    description: 'This is first input parameter',
                    nr
                },
                input2: {
                    message: 'i think i exist',
                    name: 'discard \'r'
                },
            }
        }
        const startCase = { tenant, definition, inputs };
        const caseInstance = await caseService.startCase(user, startCase) as Case;

        const calculationTask = 'CalculationTask';

        const taskId = await caseService.getCase(user, caseInstance).then(v => v.planitems.find(i => i.name === calculationTask)?.id);
        if (!taskId) {
            throw new Error(`Expecting a task with name ${calculationTask} to be available in the case, but it was not found`);
        }

        try {
            await assertPlanItemState(user, caseInstance, calculationTask, 0, 'Completed', 10);
        } catch (notFoundError) {
            // If the test fails after 10 calls, get the events for the task and see if we can print any logging info
            await debugService.getParsedEvents(taskId, user).then(events => {
                console.log("Found events " + JSON.stringify(events, undefined, 2));
            });
            throw notFoundError;
        }

        await caseFileService.getCaseFile(user, caseInstance).then(file => {
            console.log(`Case File: ${JSON.stringify(file, undefined, 2)}`);
        })

        console.log(`\nTask ID:\t${taskId}\n\nCase ID:\t${caseInstance.id}`);
    }
}

