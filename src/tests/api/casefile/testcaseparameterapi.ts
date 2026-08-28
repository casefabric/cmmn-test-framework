'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import CaseFileService from '../../../service/case/casefileservice';
import CaseService from '../../../service/case/caseservice';
import DebugService from '../../../service/case/debugservice';
import assertCaseFileContent from '../../../test/caseassertions/file';
import TestCase from '../../../test/testcase';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';
import State from '../../../cmmn/state';

const definition = Definitions.CaseParameter;
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

export default class TestCaseParameterAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    // lineReaderEnabled = true;

    async run() {
        const item = {
            RootProperty1: '1',
            RootProperty2: true
        };

        const inputs = {
            RootCaseFileItem: {
                ChildArray: []
            },
            RootCaseFileArray: [item]
        }
        const startCase = { tenant, definition, inputs };
        const caseInstance = await CaseService.startCase(user, startCase).then(instance => CaseService.getCase(user, instance));
        this.addIdentifier(caseInstance);
        caseInstance.toConsole(true);
        this.readLine('Press enter to create first array item');

        await assertCaseFileContent(user, caseInstance, 'RootCaseFileItem/ChildArray', []);
        await assertCaseFileContent(user, caseInstance, 'RootCaseFileArray', [item]);

        // await CaseFileService.createCaseFileItem(user, caseInstance, 'RootCaseFileArray', [item]);
        await assertCaseFileContent(user, caseInstance, 'RootCaseFileArray', [item]);
        const fileTaskName = 'FileReactingTask';
        // The task 'FileReactingTask' is repeating, and is started when a case file item is created or updated.
        // Upon StartCase, the case input parameter should lead to a first instance of the task.

        // There should be 1 task "FileReactingTask"
        if (caseInstance.planitems.filter(item => item.name === fileTaskName && State.Active.is(item.currentState)).length !== 1) {
            throw new Error(`Expected 1 plan item "${fileTaskName}", but found ${caseInstance.planitems.filter(item => item.name === fileTaskName).length}`);
        }

        // Now verify that the engine has properly released the bootstrap events, and still reacts to the both create and update.
        //  This reproduces case engine issue https://github.com/casefabric/case-engine/issues/562
        this.readLine('Press enter to create another array item');

        // Create another case file item, which should lead to a second instance of the task "FileReactingTask"
        item.RootProperty1 = '2';
        await CaseFileService.createCaseFileItem(user, caseInstance, 'RootCaseFileArray', item);
        await CaseService.getCase(user, caseInstance).then(instance => {
            if (instance.findItems(fileTaskName).filter(item => State.Active.is(item.currentState)).length !== 2) {
                throw new Error(`Expected 2 plan items "${fileTaskName}", but found ${instance.findItems(fileTaskName).length}`);
            }
        });

        // Now update the case file item, which should lead to a third instance of the task "FileReactingTask"
        this.readLine('Press enter to update an array item');
        item.RootProperty1 = '3';
        await CaseFileService.updateCaseFileItem(user, caseInstance, 'RootCaseFileArray', [item]);
        await CaseService.getCase(user, caseInstance).then(instance => {
            if (instance.findItems(fileTaskName).filter(item => State.Active.is(item.currentState)).length !== 3) {
                throw new Error(`Expected 3 plan items "${fileTaskName}", but found ${instance.findItems(fileTaskName).filter(item => State.Active.is(item.currentState)).length}`);
            }
        });

        // Now verify that upon recovery, the engine still reacts to the case file item update, and creates a fourth instance of the task "FileReactingTask"
        this.readLine('Press enter to force recovery');
        await DebugService.forceRecovery(user, caseInstance);

        this.readLine('Press enter to update an array item');
        item.RootProperty1 = '4';
        await CaseFileService.updateCaseFileItem(user, caseInstance, 'RootCaseFileArray', [item]);
        await CaseService.getCase(user, caseInstance).then(instance => {
            if (instance.findItems(fileTaskName).filter(item => State.Active.is(item.currentState)).length !== 4) {
                throw new Error(`Expected 4 plan items "${fileTaskName}", but found ${instance.findItems(fileTaskName).filter(item => State.Active.is(item.currentState)).length}`);
            }
        });

        this.readLine('Press enter to create another array item');
        item.RootProperty1 = '5';
        await CaseFileService.createCaseFileItem(user, caseInstance, 'RootCaseFileArray', item);
        await CaseService.getCase(user, caseInstance).then(instance => {
            if (instance.findItems(fileTaskName).filter(item => State.Active.is(item.currentState)).length !== 5) {
                throw new Error(`Expected 5 plan items "${fileTaskName}", but found ${instance.findItems(fileTaskName).filter(item => State.Active.is(item.currentState)).length}`);
            }
        });
    }
}
