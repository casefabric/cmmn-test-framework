import Case from '../cmmn/case';
import ConsentGroup from '../service/consentgroup/consentgroup';
import Tenant from '../tenant/tenant';

/**
 * Extremely simple generic TestCase class.
 */
export default class TestCase {
    public name: string = this.constructor.name
    public isDefaultTest = true;
    public isParallelTest = true;

    get isSequentialTest() {
        return !this.isParallelTest;
    }

    /**
     * Identifiers will be printed in the test summary if any.
     * They can be string, or be an object that has an id field (returned from the toString() method)
     */
    public identifiers: Array<string | Case | Tenant | ConsentGroup | undefined> = [];

    /**
     * Add an identifier for the test results summary.
     */
    addIdentifier(identifier: string | Case | Tenant | ConsentGroup | undefined) {
        this.identifiers.push(identifier);
        return identifier;
    }

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

    fail(msg = 'Failing the test at this point') {
        throw new Error(msg);
    }
}
