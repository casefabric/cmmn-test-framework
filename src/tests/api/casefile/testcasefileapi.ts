'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseFileService from '../../../framework/service/case/casefileservice';
import { assertCaseFileContent } from '../../../framework/test/assertions';
import Case from '../../../framework/cmmn/case';
import Util from '../../../framework/test/util';

const repositoryService = new RepositoryService();
const definition = 'casefile.xml';

const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

const caseFileService = new CaseFileService();

export default class TestCaseFileAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, user, tenant);
    }

    async run() {
        await this.createEmptyCaseFile();
        await this.createEmptyRootCaseFileItem();
        await this.createEmptyRootCaseFileArray();
        await this.createFullCaseFileRootItem();
        await this.createFullCaseFile();
    }

    async createEmptyCase(): Promise<Case> {
        const startCase = { tenant, definition };
        const caseInstance = await caseService.startCase(user, startCase) as Case;
        return caseInstance;
    }

    createRootItem(prop1 = "string", prop2 = true) {
        return { RootProperty1: prop1, RootProperty2: prop2 }
    }

    createChildItem(name = "name", age = 20) {
        return { ChildName: name, ChildAge: age };
    }

    createGrandChildItem(name = "name", birthdate = '2001-10-26') {
        return { GrandChildName: name, GrandChildBirthDate: birthdate };
    }

    createFamily() {
        const child = this.createChildItem();
        child.GrandChildItem = this.createGrandChildItem();
        child.GrandChildArray = [this.createGrandChildItem(), this.createGrandChildItem()];
        return child;
    }

    async createEmptyCaseFile(): Promise<Case> {
        this.logTestName("createEmptyCaseFile");
        const caseInstance = await this.createEmptyCase();

        await caseFileService.createCaseFile(caseInstance, user, {});
        await assertCaseFileContent(caseInstance, user, '', {});

        await caseFileService.createCaseFile(caseInstance, user, {
            RootCaseFileItem: {},
            RootCaseFileArray: [{}]
        });

        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem', {});
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileArray', [{}]);

        return caseInstance;
    }

    async createEmptyRootCaseFileItem() {
        this.logTestName("createEmptyRootCaseFileItem");
        const caseInstance = await this.createEmptyCase();

        await caseFileService.createCaseFileItem(caseInstance, user, 'RootCaseFileItem', {});
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem', {});

        return caseInstance;
    }

    async createEmptyRootCaseFileArray() {
        this.logTestName("createEmptyRootCaseFileArray");
        const caseInstance = await this.createEmptyCase();

        await caseFileService.createCaseFileItem(caseInstance, user, 'RootCaseFileArray', {});
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileArray', [{}]);

        return caseInstance;
    }

    async createFullCaseFileRootItem() {
        this.logTestName("createFullCaseFileRootItem");
        const caseInstance = await this.createEmptyCase();

        const caseFileItem = {
            RootProperty1: "string",
            RootProperty2: true,
            ChildItem: this.createFamily(),
            ChildArray: [this.createChildItem(), this.createChildItem()]
        }

        // Invalid Path assertions
        await caseFileService.createCaseFileItem(caseInstance, user, 'RootCasee', caseFileItem, 400);
        await caseFileService.createCaseFileItem(caseInstance, user, 'RootCaseFile[', caseFileItem, 400);
        await caseFileService.createCaseFileItem(caseInstance, user, 'RootCaseFile[/', caseFileItem, 400);
        await caseFileService.createCaseFileItem(caseInstance, user, '//RootCaseFile', caseFileItem, 400);
        await caseFileService.createCaseFileItem(caseInstance, user, '/RootCaseFile//', caseFileItem, 400);
        await caseFileService.createCaseFileItem(caseInstance, user, 'RootCaseFile', caseFileItem, 400);

        await caseFileService.createCaseFileItem(caseInstance, user, 'RootCaseFileItem', caseFileItem);
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem', caseFileItem);

        // Creating same case file item again should not be allowed
        await caseFileService.createCaseFileItem(caseInstance, user, 'RootCaseFileItem', caseFileItem, 400);

        caseFileItem.RootProperty2 = false;
        await caseFileService.updateCaseFileItem(caseInstance, user, 'RootCaseFileItem', caseFileItem);
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem/RootProperty2', false);

        // More invalid Path assertions
        const newFirstChild = this.createChildItem("diff", 40);
        await caseFileService.createCaseFileItem(caseInstance, user, 'RootCaseFileItem/ChildArray[3]', newFirstChild, 400);
        await caseFileService.createCaseFileItem(caseInstance, user, 'RootCaseFileItem/ChildArray[2]', newFirstChild, 400);
        await caseFileService.createCaseFileItem(caseInstance, user, 'RootCaseFileItem/ChildArray[1]', newFirstChild, 400);
        await caseFileService.updateCaseFileItem(caseInstance, user, 'RootCaseFileItem/ChildItem[1]', newFirstChild, 400);
        await caseFileService.updateCaseFileItem(caseInstance, user, 'RootCaseFileItem/ChildArray[1]', newFirstChild);
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem/ChildArray[1]', newFirstChild);

        await caseFileService.getCaseFile(caseInstance, user).then(file => console.log(JSON.stringify(file, undefined, 2)));
        caseFileItem.ChildArray.push(this.createFamily());
        await caseFileService.replaceCaseFileItem(caseInstance, user, 'RootCaseFileItem', caseFileItem);
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem', caseFileItem);

        await caseFileService.replaceCaseFileItem(caseInstance, user, 'RootCaseFileItem/ChildArray', caseFileItem.ChildArray);
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem', caseFileItem);

        // It should not be possible to set an invalid type of property, both for update and replace
        const invalidPropertyValue = { RootProperty2: 'string instead of boolean' };
        await caseFileService.updateCaseFileItem(caseInstance, user, 'RootCaseFileItem', invalidPropertyValue, 400);
        await caseFileService.replaceCaseFileItem(caseInstance, user, 'RootCaseFileItem', invalidPropertyValue, 400);

        // Also a deeper nested type of property must have the valid type, both for update and replace
        const invalidNestedPropertyValue = Util.clone(caseFileItem);
        invalidNestedPropertyValue.ChildItem.ChildAge = true;
        await caseFileService.updateCaseFileItem(caseInstance, user, 'RootCaseFileItem', invalidNestedPropertyValue, 400);
        await caseFileService.replaceCaseFileItem(caseInstance, user, 'RootCaseFileItem', invalidNestedPropertyValue, 400);

        // Also a deeper nested type of property must be defined, both for update and replace
        const undefinedNestedPropertyValue = Util.clone(caseFileItem);
        undefinedNestedPropertyValue.ChildItem.ChildBirthDate = '2001-10-26';
        await caseFileService.updateCaseFileItem(caseInstance, user, 'RootCaseFileItem', undefinedNestedPropertyValue, 400);
        await caseFileService.replaceCaseFileItem(caseInstance, user, 'RootCaseFileItem', undefinedNestedPropertyValue, 400);

        // Update the case file item with only a new value for "RootProperty1" should only change that field.
        const shallowCopy = { RootProperty1: "second string" };
        caseFileItem.RootProperty1 = shallowCopy.RootProperty1; // Update the field locally for the assertion to work
        await caseFileService.updateCaseFileItem(caseInstance, user, 'RootCaseFileItem', shallowCopy);
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem', caseFileItem);

        // Replace the case file item with the shallow copy should remove all others
        await caseFileService.replaceCaseFileItem(caseInstance, user, 'RootCaseFileItem', shallowCopy);
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem', shallowCopy);

        // And putting back old structure should work too
        await caseFileService.replaceCaseFileItem(caseInstance, user, 'RootCaseFileItem', caseFileItem);
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem', caseFileItem);

        // Testing some deeper property updates
        const deeplyNestedPropertyUpdate = Util.clone(caseFileItem);
        deeplyNestedPropertyUpdate.RootProperty1 = "Trying to do deep property updates";
        deeplyNestedPropertyUpdate.ChildArray[2].GrandChildArray[0].GrandChildName = "Second name update";
        deeplyNestedPropertyUpdate.ChildArray[1].ChildName = "First name update";
        await caseFileService.updateCaseFileItem(caseInstance, user, 'RootCaseFileItem', deeplyNestedPropertyUpdate);
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem/ChildArray[2]', deeplyNestedPropertyUpdate.ChildArray[2]);
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem/ChildArray[1]/ChildName', "First name update");

        // Testing some deeper path based updates
        const childItemUpdate = this.createChildItem(undefined, 26);
        await caseFileService.updateCaseFileItem(caseInstance, user, 'RootCaseFileItem/ChildItem', childItemUpdate);
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem/ChildItem/ChildAge', 26);

        // Testing some deeper path based updates
        const secondGrandChildArrayUpdate = [this.createGrandChildItem(), this.createGrandChildItem('My favorite kid'), this.createGrandChildItem('Just one more')];
        await caseFileService.updateCaseFileItem(caseInstance, user, 'RootCaseFileItem/ChildItem/GrandChildArray', secondGrandChildArrayUpdate);

        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem/ChildItem/ChildAge', 26);
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem/ChildItem/GrandChildArray', secondGrandChildArrayUpdate);

        await caseFileService.deleteCaseFileItem(caseInstance, user, 'RootCaseFileItem/ChildItem');
        await caseFileService.deleteCaseFileItem(caseInstance, user, 'RootCaseFileItem/ChildItem', 400);

        // Child item now must be undefined
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem/ChildItem', undefined);

        // Delete entire case file
        await caseFileService.deleteCaseFileItem(caseInstance, user, 'RootCaseFileItem');
        // Top level must be empty object
        await assertCaseFileContent(caseInstance, user, '', {});

        return caseInstance;
    }

    logTestName(name: string) {
        console.log(`\n=============== CASE FILE API TEST ${name}`);
    }

    async createFullCaseFile() {
        this.logTestName("createFullCaseFile");
        const caseInstance = await this.createEmptyCase();

        const caseFileItem = {
            RootProperty1: "string",
            RootProperty2: true,
            ChildItem: this.createFamily(),
            ChildArray: [this.createChildItem(), this.createChildItem()]
        }

        const caseFile = {
            RootCaseFileItem: caseFileItem,
            RootCaseFileArray: [{}]
        }

        await caseFileService.createCaseFile(caseInstance, user, caseFile);
        await assertCaseFileContent(caseInstance, user, '', caseFile, true);// true --> the content matching is logged to console

        const updateCaseFileArray = {
            RootCaseFileArray: [{
                RootProperty1: "string",
                RootProperty2: true,
            }]
        }

        // Updating case file should add the RootCaseFileArray content
        await caseFileService.updateCaseFile(caseInstance, user, updateCaseFileArray);
        await assertCaseFileContent(caseInstance, user, '', {
            RootCaseFileItem: caseFileItem,
            RootCaseFileArray: [{
                RootProperty1: "string",
                RootProperty2: true
            }]
        });

        // Replacing case file should remove the RootCaseFileItem
        await caseFileService.replaceCaseFile(caseInstance, user, updateCaseFileArray);
        await assertCaseFileContent(caseInstance, user, '', {
            RootCaseFileArray: [{
                RootProperty1: "string",
                RootProperty2: true
            }]
        });

        // After clearing the RootCaseFileItem we can create it again, as it was removed, not discarded.
        await caseFileService.createCaseFileItem(caseInstance, user, 'RootCaseFileItem', caseFileItem);
        await assertCaseFileContent(caseInstance, user, '', {
            RootCaseFileItem: caseFileItem,
            RootCaseFileArray: [{
                RootProperty1: "string",
                RootProperty2: true
            }]
        }, true);

        // Similarly, we can clear even the entire case file contents!
        await caseFileService.replaceCaseFile(caseInstance, user, {});
        await assertCaseFileContent(caseInstance, user, '', {});

        const newCaseFile = {
            RootCaseFileItem: caseFileItem,
            RootCaseFileArray:  [{
                RootProperty1: "string",
                RootProperty2: true
            }]
        }

        // And thereafter create an entirely new one ...
        await caseFileService.createCaseFile(caseInstance, user, newCaseFile);
        await assertCaseFileContent(caseInstance, user, '', newCaseFile);

        // ... but not twice
        await caseFileService.createCaseFile(caseInstance, user, newCaseFile, 400);
    }
}
