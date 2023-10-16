'use strict';

import Trace from '../../../infra/trace';
import logger from '../../../logger';
import CaseIdentifierService from '../../../service/identifier/caseidentifierservice';
import IdentifierFilter from '../../../service/identifier/identifierfilter';
import TestCase from '../../../test/testcase';
import Util from '../../../test/util';
import WorldWideTestTenant from '../../worldwidetesttenant';
import TestFootballBusinessIdentifiers from './footballbusinessidentifiers/testfootballbusinessidentifiers';

const worldwideTenant = new WorldWideTestTenant(Util.generateId('inactive-tenant-'));
const user = worldwideTenant.sender;

export default class TestBusinessIdentifiers extends TestCase {
    lists: Array<any> = [];
    async onPrepareTest() {
        // Make sure users are logged in
        await worldwideTenant.create();        
    }

    async run() {
        const footballTest = new TestFootballBusinessIdentifiers();
        await footballTest.onPrepareTest();
        await footballTest.run();
        await footballTest.onCloseTest();

        const footballTest2 = new TestFootballBusinessIdentifiers();
        await footballTest2.onPrepareTest();
        await footballTest2.run();
        await footballTest2.onCloseTest();

        console.log("Closed ft, running test")

        await this.printList();
        await this.printList({ tenant : worldwideTenant.name});
        await this.printList({ tenant : footballTest.tenant});
        await this.printList({ tenant : footballTest2.tenant});
        await this.printList({ name : 'clubname'});
        await this.printList({ offset : 10, numberOfResults: 5});
        await this.printList({ name : 'name'});

        await CaseIdentifierService.getIdentifierNames(user).then(list => {
            logger.debug(`List: ${JSON.stringify(list, undefined, 2)}`);
        });

        this.lists.forEach((list, index) => {
            console.log(`List[${index}] has ${list.length} items`);
        });

        // These sizes are expected in the first 4 test cases. 
        //  - Plain printing gives the default numOfResults, which is 100.
        //  - Second list is with our own inactive tenant -> should not have any identifiers
        //  - Third and fourth are the 2 football test tenants created in this test, and should each have 62 identifiers.
        const expectedListSizes = [100, 0, 62, 62];

        expectedListSizes.forEach((expectedSize, index) => {
            if (this.lists[index].length !== expectedSize) {
                throw new Error(`List[${index}] has ${this.lists[index].length} items, but we expected ${expectedSize} items instead`);
            }
        });
    }

    async printList(filter?: IdentifierFilter, trace: Trace = new Trace()) {
        const list = await CaseIdentifierService.getIdentifiers(user, filter, undefined, undefined, trace);
        this.lists.push(list);
        logger.debug(`List: ${JSON.stringify(list, undefined, 2)}`);
    }
}