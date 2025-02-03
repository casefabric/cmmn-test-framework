'use strict';

import Definitions from '../../definitions/definitions';
import TestArchiveCase from './testarchivecase';

const helloworld = Definitions.HelloWorld;

export default class TestArchiveHelloworld extends TestArchiveCase {

  async run() {
    await super.test(helloworld);
  }
}
