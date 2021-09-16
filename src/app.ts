import TestCase from './framework/test/testcase';
import TestStatsAPI from './tests/api/case/teststatsapi';
import TestUsersCaseAPI from './tests/api/case/usercases';
import TestDiscretionaryItems from './tests/api/discretionary/testdiscretionaryitems';
import TestDebugMode from './tests/api/debug/testdebugmode';
import TestHelloworld from './tests/helloworld/testhelloworld';
import TestIncidentManagement from './tests/incidentmanagement/incidentmanagement';
import TestTenantRegistration from './tests/api/tenant/testtenantregistration';
import TestTaskValidationAPI from './tests/api/task/humantask/testtaskvalidationapi';
import Config from './config';
import TestRepositoryAPI from './tests/api/repository/testrepositoryapi';
import TestTokenValidation from './tests/api/environment/tokentest';
import TestCaseFileAPI from './tests/api/casefile/testcasefileapi';
import TestCasePlanAPI from './tests/api/caseplan/testcaseplanapi';
import TestEventAuthorization from './tests/api/caseplan/testeventauthorization';
import PingTestEnvironment, { PingTokenService } from './tests/api/environment/ping';
import TestTravelRequest from './tests/travelrequest/testtravelrequest';
import TestEntryCriteriaOnCaseInputParameters from './tests/api/caseplan/stage/testentrycriteriaoncaseinputparameters';
import TestStage from './tests/api/caseplan/stage/teststage';
import TestCaseTeamAPI from './tests/api/caseteam/testcaseteamapi';
import TestCaseTeamTenantRoleBinding from './tests/api/caseteam/testrolebinding';
import TestTaskAPI from './tests/api/task/humantask/testtaskapi';
import TestTaskCountAPI from './tests/api/task/humantask/testtaskcountapi';
import TestCaseTeam from './tests/api/caseteam/testcaseteam';
import TestInvalidStartCase from './tests/api/case/testinvalidstartcase';
import TestValidStartCase from './tests/api/case/testvalidstartcase';
import TestStartCaseEmptyRole from './tests/api/caseteam/teststartcaseemptyrole';
import TestResponseType from './tests/api/environment/testresponsetype';
import TestBusinessIdentifiers from './tests/api/businessidentifiers/testbusinessidentifiers';
import TestFootballBusinessIdentifiers from './tests/api/businessidentifiers/footballbusinessidentifiers/testfootballbusinessidentifiers';
import TestCaseTeamTaskAuthorizations from './tests/api/caseteam/testcaseteamtaskauthorizations';
import TestSubCase from './tests/api/task/case/testsubcase';
import TestTaskCompletion from './tests/api/casefile/testtaskcompletion';
import TestTaskOutputOperations from './tests/api/casefile/testtaskoutputoperations';
import TestRepeatStage from './tests/api/stage/testrepeatstage';
import TestGetListGetDetails from './tests/getlistgetdetails/getlistgetdetails';
import TestBootstrapCaseFileEvents from './tests/api/case/testbootstrapcasefileevents';
import TestDocumentationAPI from './tests/api/documentation/testdocumentationapi';
import TestCasePlanHistoryAPI from './tests/api/caseplan/testcaseplanhistoryapi';
import TestTaskFilterAPI from './tests/api/task/humantask/testtaskfilterapi';
import TestTaskExpressions from './tests/api/expression/testtaskexpressions';
import TestStageTaskExpressions from './tests/api/expression/teststagetaskexpressions';
import TestProcessTask from './tests/api/caseplan/task/testprocesstask';
import TestRepeatWithMapping from './tests/api/expression/testrepeatwithmapping';
import TestSMTP from './tests/api/task/process/testsmtp';
import TestTaskBindingRefinement from './tests/api/casefile/testtaskbindingrefinement';
import TestArraySubCase from './tests/api/task/case/testarraysubcase';
import TestAnonymousStartCase from './tests/api/anonymous/testanonymousstartcase';
import TestNoAnonymousStartCase from './tests/api/anonymous/testnoanonymousstartcase';
import TestCalculation from './tests/api/task/process/testcalculation';
import TestHelloWorldBusinessIdentifiers from './tests/api/businessidentifiers/testhelloworldbusinessidentifiers';
import TestCaseFileArrayAPI from './tests/api/casefile/testcasefilearrayapi';
import TestCaseMigration from './tests/api/case/migration/testcasemigration';
import TestSubCaseMigration from './tests/api/case/migration/testsubcasemigration';
import TestRecovery from './tests/api/environment/testrecovery';
import TestSwagger from './tests/api/environment/testswagger';
import TestConsentGroupAPI from './tests/api/consentgroup/testconsentgroupapi';
import TestCaseTeamConsentGroupAPI from './tests/api/caseteam/testcaseteamconsentgroupapi';

function findTestsFromCommandLineArguments(): Array<string> {
    const time = process.argv[2];
    if (time && !isNaN(Number(time))) {
        console.log('Setting CQRS wait time to ' + time)
        Config.CafienneService.cqrsWaitTime = Number(time);
        return process.argv.slice(3);
    } else {
        return process.argv.slice(2);
    }
}

class TestClasses {
    private testsByName: any = {
    }
    private static testList: Array<any> = [];

    constructor(public list: Array<Function>) {
        list.forEach(f => {
            this.testsByName[f.name] = f
            TestClasses.testList.push({ name: f.name.toLowerCase(), test: f })
        });
    }

    static getTestClass(name: string) {
        const t = TestClasses.testList.find(t => t.name === name.toLowerCase());
        if (!t) {
            throw new Error(`Cannot find a test '${name}'`);
        }
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
    list: Array<TestResult> = [];
    constructor() { }
    addTest(result: TestResult) {
        this.list.push(result);
    }

    toString() {
        return this.list.map(test => `  - ${test}\n`).join('');
    }
}

const AllTestCases = new TestClasses([
    PingTokenService
    , PingTestEnvironment
    , TestResponseType
    , TestSwagger
    , TestHelloworld
    , TestTenantRegistration
    , TestConsentGroupAPI
    , TestTaskCompletion
    , TestTaskOutputOperations
    , TestTaskBindingRefinement
    , TestEntryCriteriaOnCaseInputParameters
    , TestStage
    , TestUsersCaseAPI
    , TestDiscretionaryItems
    , TestStatsAPI
    , TestTaskValidationAPI
    , TestTaskAPI
    , TestTaskFilterAPI
    , TestTaskCountAPI
    , TestDebugMode
    , TestDocumentationAPI
    , TestRepositoryAPI
    , TestTokenValidation
    , TestCaseFileAPI
    , TestCaseFileArrayAPI
    , TestBootstrapCaseFileEvents
    , TestCasePlanAPI
    , TestCasePlanHistoryAPI
    , TestBusinessIdentifiers
    , TestFootballBusinessIdentifiers
    , TestHelloWorldBusinessIdentifiers
    , TestRepeatWithMapping
    , TestTaskExpressions
    , TestStageTaskExpressions
    , TestProcessTask
    , TestCaseTeamAPI
    , TestCaseTeam
    , TestCaseTeamTenantRoleBinding
    , TestCaseTeamConsentGroupAPI
    , TestCaseTeamTaskAuthorizations
    , TestEventAuthorization
    , TestIncidentManagement
    , TestTravelRequest
    , TestInvalidStartCase
    , TestValidStartCase
    , TestStartCaseEmptyRole
    , TestSubCase
    , TestArraySubCase
    , TestRepeatStage
    , TestSMTP
    , TestNoAnonymousStartCase
    , TestAnonymousStartCase
    , TestCalculation
    , TestGetListGetDetails
    , TestCaseMigration
    , TestSubCaseMigration
    , TestRecovery
]);


function getTestCaseInstances(testDeclarations: Array<any>, onlyDefaults: boolean) {
    // Filter out undefined tests (e.g., because trailing comma is first one)
    return testDeclarations.filter(test => test).map(test => {
        if (test instanceof TestCase) return test;
        if (typeof (test) === 'function') {
            return new test();
        }
        throw new Error('Test ' + test + ' of type "' + typeof (test) + '" cannot be converted to a TestCase');
    }).filter((test: TestCase) => !onlyDefaults || test.isDefaultTest); // Filter out tests that should not be run by default
}

async function runTests(testDeclarations: Array<any>, onlyDefaults: boolean) {
    const tests: Array<TestCase> = getTestCaseInstances(testDeclarations, onlyDefaults);
    const results = new TestResults();
    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        const result = new TestResult(test);
        const calculatedWhitespace = '                                         '.substring(test.name.length)
        try {
            console.log(`\n
####################################################################
#                                                                  #
#      PREPARING TEST:  "${test.name}"${calculatedWhitespace}#
#                                                                  #
####################################################################
                        `);
            const preparationDone = await test.onPrepareTest();
            console.log(`\n
####################################################################
#                                                                  #
#      STARTING TEST:   "${test.name}"${calculatedWhitespace}#
#                                                                  #
####################################################################
                        `);
            const testRun = await test.run();
            console.log(`\n
####################################################################
#                                                                  #
#      CLOSING TEST:    "${test.name}"${calculatedWhitespace}#
#                                                                  #
####################################################################
                        `);
            const closeDone = await test.onCloseTest();
            result.finished();
            results.addTest(result);
        } catch (error) {
            const resultString = results.list.length == 0 ? '' : `  Succesful tests:\n${results.toString()}\n`;
            throw new TestError(error, `\n\nTest ${i + 1} "${test.name}" failed.\n${resultString}\nTest ${i + 1} "${test.name}" failed.\n${error.constructor.name}: ${error.message}\n`);
        }
    }
    return results;
}

function main() {

    const commandLineTestNames = findTestsFromCommandLineArguments();
    const commandLineTestClasses = commandLineTestNames.map(TestClasses.getTestClass)
    const runDefaultTests = commandLineTestClasses.length > 0 ? false : true;
    const testDeclarations = runDefaultTests ? AllTestCases.list : commandLineTestClasses;

    const startTime = new Date();
    console.log(`=========\n\nStarting ${testDeclarations.length} test cases at ${startTime}\n`);

    runTests(testDeclarations, runDefaultTests).then(results => {
        const endTime = new Date();
        console.log(`\n=========\n\nTesting completed in ${endTime.getTime() - startTime.getTime()} milliseconds at ${endTime}\nResults:\n${results.toString()}`);
        process.exit(0)
    }).catch(e => {
        console.error(e);
        process.exit(-1);
    });
}

try {
    main();
} catch (error) {
    console.log(error.message);
    process.exit(-1);
}

class TestError extends Error {
    constructor(public error: Error, message: string) {
        super(message);
    }
}
