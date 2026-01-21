import Case from '../cmmn/case';
import ConsentGroup from '../service/consentgroup/consentgroup';
import Tenant from '../tenant/tenant';
import LineReader from '../util/linereader';
import PlanItem from '../cmmn/planitem';

/**
 * Extremely simple generic TestCase class.
 */
export default abstract class TestCase {
    private reader: LineReader = new LineReader();
    /**
     * Enable or disable line reading in this test case
     */
    protected lineReaderEnabled = false;
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
    public identifiers: Array<string | Case | PlanItem | Tenant | ConsentGroup | undefined> = [];

    /**
     * Add an identifier for the test results summary.
     */
    addIdentifier(identifier: string | Case | PlanItem | Tenant | ConsentGroup | undefined) {
        if (identifier) {
            this.identifiers.push(identifier);
        }
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
    abstract run(): Promise<any>;

    /**
     * Hook that can be implemented to cleanup information after the run method has been invoked.
     */
    async onCloseTest(): Promise<any> {

    }

    fail(msg = 'Failing the test at this point') {
        throw new Error(msg);
    }

    /**
     * Simplistic mechanism to enable manual breakpoints and user inputs while running tests
     * @param question String to be printed on console
     * @returns 
     */
    readLine(question: string = 'Press enter to continue'): string {
        return this.reader.question(question, this.lineReaderEnabled);
    }
}
