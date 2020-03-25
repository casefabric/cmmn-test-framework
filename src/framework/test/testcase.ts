import fs from 'fs';
import { DOMParser } from 'xmldom';

/**
 * Extremely simple generic TestCase class.
 */
export default class TestCase {
    public name: string = this.constructor.name

    /**
     * Create a new TestCase with the given name.
     * The name can be used for logging purposes.
     */
    constructor() { }

    /**
     * Hook that can be implemented to setup information inside the TestCase before the run method is being invoked.
     */
    async onPrepareTest(): Promise<any> {

    }

    /**
     * Run method must be implemented inside the test case
     */
    async run(): Promise<any> {
        throw new Error('The method run must be implemented in class ' + this.constructor.name);
    }

    /**
     * Hook that can be implemented to cleanup information after the run method has been invoked.
     */
    async onCloseTest(): Promise<any> {

    }
}
