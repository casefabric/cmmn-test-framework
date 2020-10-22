'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseFileService from '../../../framework/service/case/casefileservice';
import { assertCaseFileContent } from '../../../framework/test/assertions';
import Case from '../../../framework/cmmn/case';
import clone from '../../../framework/test/util';
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
        await this.createEmptyRootCaseFileItem();
        await this.createEmptyRootCaseFileArray();
        await this.createFullCaseFile();
    }

    async createEmptyCase(): Promise<Case> {
        const startCase = { tenant, definition };
        const caseInstance = await caseService.startCase(startCase, user) as Case;
        return caseInstance;
    }

    createRootItem(prop1 = "string", prop2 = true) {
        return { RootProperty1: prop1, RootProperty2: prop2}
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

    async createEmptyRootCaseFileItem() {
        console.log("Test creating an empty root case file item");
        const caseInstance = await this.createEmptyCase();

        await caseFileService.createCaseFileItem(caseInstance, user, 'RootCaseFileItem', {});
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem', {});

        return caseInstance;
    }

    async createEmptyRootCaseFileArray() {
        console.log("Test creating an empty root case file item array");
        const caseInstance = await this.createEmptyCase();

        await caseFileService.createCaseFileItem(caseInstance, user, 'RootCaseFileArray', {});
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileArray', [{}]);

        return caseInstance;
    }

    async createFullCaseFile() {
        console.log("Test creating an empty root case file item array");
        const caseInstance = await this.createEmptyCase();

        const caseFileItem = {
            RootProperty1: "string",
            RootProperty2: true,
            ChildItem: this.createFamily(),
            ChildArray: [this.createChildItem(), this.createChildItem()]
        }

        await caseFileService.createCaseFileItem(caseInstance, user, 'RootCaseFileItem', caseFileItem);
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem', caseFileItem);

        caseFileItem.RootProperty2 = false;        
        await caseFileService.updateCaseFileItem(caseInstance, user, 'RootCaseFileItem', caseFileItem);
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem/RootProperty2', false);

        caseFileItem.ChildArray.push(this.createFamily());
        await caseFileService.replaceCaseFileItem(caseInstance, user, 'RootCaseFileItem', caseFileItem);
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem', caseFileItem);

        await caseFileService.replaceCaseFileItem(caseInstance, user, 'RootCaseFileItem/ChildArray', caseFileItem.ChildArray);
        await assertCaseFileContent(caseInstance, user, 'RootCaseFileItem', caseFileItem);

        // It should not be possible to set an invalid type of property
        const invalidPropertyValue = {RootProperty2 : 'string instead of boolean'};
        await caseFileService.updateCaseFileItem(caseInstance, user, 'RootCaseFileItem', invalidPropertyValue, false);

        // Also a deeper nested type of property must have the valid type
        const invalidNestedPropertyValue = Util.clone(caseFileItem);
        invalidNestedPropertyValue.ChildItem.ChildAge = true;
        await caseFileService.updateCaseFileItem(caseInstance, user, 'RootCaseFileItem', invalidNestedPropertyValue, false);

        // Also a deeper nested type of property must be defined
        const undefinedNestedPropertyValue = Util.clone(caseFileItem);
        undefinedNestedPropertyValue.ChildItem.ChildBirthDate = '2001-10-26';
        await caseFileService.updateCaseFileItem(caseInstance, user, 'RootCaseFileItem', undefinedNestedPropertyValue, false);

        // Update the case file item with only a new value for "RootProperty1" should only change that field.
        const shallowCopy = {RootProperty1 : "second string"};
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

        return caseInstance;
    }
}
