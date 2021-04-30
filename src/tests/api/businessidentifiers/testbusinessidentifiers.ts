'use strict';

import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import CaseIdentifierService from '../../../framework/service/identifier/caseidentifierservice';
import IdentifierFilter from '../../../framework/service/identifier/identifierfilter';

const identifierService = new CaseIdentifierService();
const worldwideTenant = new WorldWideTestTenant();

const user = worldwideTenant.sender;

export default class TestBusinessIdentifiers extends TestCase {
    lists: Array<any> = [];
    async onPrepareTest() {
        // Make sure users are logged in
        await worldwideTenant.create();        
    }

    async run() {
        await this.printList();
        await this.printList({ tenant : worldwideTenant.name});
        await this.printList({ name : 'clubname'});
        await this.printList({ offset : 10, numberOfResults: 5});
        await this.printList({ name : 'name'});

        this.lists.forEach((list, index) => {
            console.log(`List[${index}] has ${list.length} items`);
        })

        await identifierService.getIdentifierNames(user).then(list => {
            console.log(`List: ${JSON.stringify(list, undefined, 2)}`);

        })
    }

    async printList(filter?: IdentifierFilter) {
        const list = await identifierService.getIdentifiers(user, filter);
        this.lists.push(list);
        console.log(`List: ${JSON.stringify(list, undefined, 2)}`);
    }
}