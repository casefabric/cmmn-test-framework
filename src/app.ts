import TestCase from './framework/test/testcase';
import TestStatsAPI from './tests/api/case/teststatsapi';
import TestUsersCaseAPI from './tests/api/case/usercases';
import TestDiscretionaryItems from './tests/api/discretionary/testdiscretionaryitems';
import TestDebugMode from './tests/api/debug/testdebugmode';
import TestHelloworld from './tests/helloworld/helloworld';
import TestIncidentManagement from './tests/incidentmanagement/incidentmanagement';
import TestTenantRegistration from './tests/api/tenant/testtenantregistration';
import TestTaskValidationAPI from './tests/api/task/taskvalidation';
import Config from './config';
import TestRepositoryAPI from './tests/api/repository/repositorytest';
import TestTokenValidation from './tests/api/environment/tokentest';
import TestCaseFileAPI from './tests/api/casefile/testcasefileapi';
import TestCasePlanAPI from './tests/api/caseplan/testcaseplanapi';
import TestEventAuthorization from './tests/api/caseplan/testeventauthorization';
import PingTestEnvironment from './tests/api/environment/ping';
import TestTravelRequest from './tests/travelrequest/testtravelrequest';
import TestRepeatingStage from './tests/stage/teststage';
import TestCaseTeamAPI from './tests/api/caseteam/testcaseteamapi';
import TestRoleBinding from './tests/api/caseteam/testrolebinding';
import TestTaskAPI from './tests/api/task/testtaskapi';
import TestTaskCountAPI from './tests/api/task/testtaskcountapi';
import TestCaseTeam from './tests/api/caseteam/testcaseteam';
import TestInvalidStartCase from './tests/api/case/testinvalidstartcase';
import TestValidStartCase from './tests/api/case/testvalidstartcase';
import TestCaseOwnerDelegateRevokeTasks from './tests/api/caseteam/testcaseownerdelegaterevoketasks';
import TestStartCaseEmptyRole from './tests/api/caseteam/teststartcaseemptyrole';
import TestResponseType from './tests/api/environment/testresponsetype';


function findTestsFromCommandLineArguments(): Array<string> {
    const time = process.argv[2];
    if (time && !isNaN(Number(time))) {
        console.log('Setting CQRS wait time to '+time)
        Config.CafienneService.cqrsWaitTime = Number(time);
    }

    // TODO: it will be nice if we can implement running test cases given from command line,
    //  but as of now (because TypeScript transpiling the class names?) they cannot be found in runtime based on string
    return process.argv.slice(3);
}

class TestClasses {
    private testsByName: any = {
    }
    private static testList: Array<any> = [];

    constructor(public list: Array<Function>){
        list.forEach(f => {
            this.testsByName[f.name] = f
            TestClasses.testList.push({name:f.name.toLowerCase(), test: f})
        });
    }

    static getTestClass(name: string) {
        const t = TestClasses.testList.find(t => t.name === name.toLowerCase());
        return t.test;
    }
}

class TestResult {
    name: string;
    started: Date = new Date();
    ended: Date = new Date();
    constructor(public test: TestCase) {
        this.name = test.name;
    }
    finished() {
        this.ended = new Date();
    }

    toString() {
        return `${this.name} (${(this.ended.getTime() - this.started.getTime())} ms)`; 
    }
}

class TestResults {
    list:Array<TestResult> = [];
    constructor() {}
    addTest(result: TestResult) {
        this.list.push(result);
    }

    toString() {
        return this.list.map(test => `  - ${test}\n`).join('');
    }
}

const AllTestCases = new TestClasses( [
    PingTestEnvironment
    , TestResponseType
    , TestHelloworld
    , TestRepeatingStage
    , TestUsersCaseAPI
    , TestDiscretionaryItems
    , TestStatsAPI
    , TestTaskValidationAPI
    , TestTaskAPI
    , TestTaskCountAPI
    , TestDebugMode
    , TestTenantRegistration
    , TestRepositoryAPI
    , TestTokenValidation
    , TestCaseFileAPI
    , TestCasePlanAPI
    , TestCaseTeamAPI
    , TestRoleBinding
    , TestCaseTeam
    , TestEventAuthorization
    // , TestIncidentManagement
    , TestTravelRequest
    , TestInvalidStartCase
    , TestValidStartCase
    , TestCaseOwnerDelegateRevokeTasks
    , TestStartCaseEmptyRole
]);


function getTestCaseInstances(testDeclarations: Array<any>) {
    // Filter out undefined tests (e.g., because trailing comma is first one)
    return testDeclarations.filter(test => test).map(test => {
        if (test instanceof TestCase) return test;
        if (typeof (test) === 'function') {
            return new test();
        }
        throw new Error('Test ' + test + ' of type "' + typeof (test) + '" cannot be converted to a TestCase');
    });
}

async function runTests(testDeclarations: Array<any>) {
    const tests: Array<TestCase> = getTestCaseInstances(testDeclarations);
    const results = new TestResults();
    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        const result = new TestResult(test);
        const calculatedWhitespace = '                               '.substring(test.name.length)
        try {
            console.log(`\n
##########################################################
#                                                        #
#      PREPARING TEST:  "${test.name}"${calculatedWhitespace}#
#                                                        #
##########################################################
                        `);
            const preparationDone = await test.onPrepareTest();
            console.log(`\n
##########################################################
#                                                        #
#      STARTING TEST:   "${test.name}"${calculatedWhitespace}#
#                                                        #
##########################################################
                        `);
            const testRun = await test.run();
            console.log(`\n
##########################################################
#                                                        #
#      CLOSING TEST:    "${test.name}"${calculatedWhitespace}#
#                                                        #
##########################################################
                        `);
            const closeDone = await test.onCloseTest();
            result.finished();
            results.addTest(result);
        } catch (error) {
            const resultString = results.list.length == 0 ? '' : `  Succesful tests:\n${results.toString()}\n`;
            throw new TestError(error, `\n\nTest ${i+1} "${test.name}" failed.\n${resultString}${error.constructor.name}: ${error.message}\n`);
        }
    }
    return results;
}

const commandLineTestNames = findTestsFromCommandLineArguments();
const commandLineTestClasses = commandLineTestNames.map(TestClasses.getTestClass)
const testDeclarations = commandLineTestNames.length > 0 ? commandLineTestClasses : AllTestCases.list;

console.log('=========\nCreating test cases\n')

const startTime = new Date();
console.log('=========\n\nStarting test cases at ' + startTime + '\n');

runTests(testDeclarations).then(results => {
    const endTime = new Date();
    console.log(`\n=========\n\nTesting completed in ${endTime.getTime() - startTime.getTime()} milliseconds at ${endTime}\nResults:\n${results.toString()}`);
    process.exit(0)
}).catch(e => {
    console.error(e);
    process.exit(-1);
});

class TestError extends Error {
    constructor(public error:Error, message:string) {
        super(message);
    }
}
