'use strict';

import TestArchiveCase from './testarchivecase';

const helloworld = 'helloworld.xml';

export default class TestArchiveHelloworld extends TestArchiveCase {

  async run() {
    await super.test(helloworld);
  }
}
