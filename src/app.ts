import CafienneConfig from '@cafienne/typescript-client/config';
import TestCase from '@cafienne/typescript-client/test/testcase';
import Config from './config';
import NextVersion from './nextversion/nextversion';
import TestAnonymousStartCase from './tests/api/anonymous/testanonymousstartcase';
import TestNoAnonymousStartCase from './tests/api/anonymous/testnoanonymousstartcase';
import TestArchiveCase from './tests/api/archiving/testarchivecase';
import TestDeleteCase from './tests/api/archiving/testdeletecase';
import TestDeleteTenant from './tests/api/archiving/testdeletetenant';
import TestDeleteTenantWithContent from './tests/api/archiving/testdeletetenantwithcontent';
import TestFootballBusinessIdentifiers from './tests/api/businessidentifiers/footballbusinessidentifiers/testfootballbusinessidentifiers';
import TestBusinessIdentifiers from './tests/api/businessidentifiers/testbusinessidentifiers';
import TestHelloWorldBusinessIdentifiers from './tests/api/businessidentifiers/testhelloworldbusinessidentifiers';
import TestCaseMigration from './tests/api/case/migration/testcasemigration';
import TestSubCaseMigration from './tests/api/case/migration/testsubcasemigration';
import TestBootstrapCaseFileEvents from './tests/api/case/testbootstrapcasefileevents';
import TestDefinitionInStartCase from './tests/api/case/testdefinitioninstartcase';
import TestInvalidStartCase from './tests/api/case/testinvalidstartcase';
import TestStatsAPI from './tests/api/case/teststatsapi';
import TestValidStartCase from './tests/api/case/testvalidstartcase';
import TestUsersCaseAPI from './tests/api/case/usercases';
import TestCaseFileAPI from './tests/api/casefile/testcasefileapi';
import TestCaseFileArrayAPI from './tests/api/casefile/testcasefilearrayapi';
import TestTaskBindingRefinement from './tests/api/casefile/testtaskbindingrefinement';
import TestTaskCompletion from './tests/api/casefile/testtaskcompletion';
import TestTaskOutputOperations from './tests/api/casefile/testtaskoutputoperations';
import TestTimer from './tests/api/caseplan/event/testtimer';
import TestEntryCriteriaOnCaseInputParameters from './tests/api/caseplan/stage/testentrycriteriaoncaseinputparameters';
import TestStage from './tests/api/caseplan/stage/teststage';
import TestAuthenticationFlow from './tests/api/caseplan/task/testauthenticationflow';
import TestProcessTask from './tests/api/caseplan/task/testprocesstask';
import TestTaskWithSpaces from './tests/api/caseplan/task/testtaskwithspaces';
import TestCasePlanAPI from './tests/api/caseplan/testcaseplanapi';
import TestCasePlanHistoryAPI from './tests/api/caseplan/testcaseplanhistoryapi';
import TestEventAuthorization from './tests/api/caseplan/testeventauthorization';
import TestCaseTeam from './tests/api/caseteam/testcaseteam';
import TestCaseTeamAPI from './tests/api/caseteam/testcaseteamapi';
import TestCaseTeamAuthorizations from './tests/api/caseteam/testcaseteamauthorizations';
import TestCaseTeamConsentGroupAPI from './tests/api/caseteam/testcaseteamconsentgroupapi';
import TestCaseTeamTaskAuthorizations from './tests/api/caseteam/testcaseteamtaskauthorizations';
import TestCaseTeamTenantRoleMembers from './tests/api/caseteam/testcaseteamtenantrolemembers';
import TestStartCaseEmptyRole from './tests/api/caseteam/teststartcaseemptyrole';
import TestConsentGroupAPI from './tests/api/consentgroup/testconsentgroupapi';
import TestDebugMode from './tests/api/debug/testdebugmode';
import TestDiscretionaryItems from './tests/api/discretionary/testdiscretionaryitems';
import TestDocumentationAPI from './tests/api/documentation/testdocumentationapi';
import PingTestEnvironment, { PingTokenService } from './tests/api/environment/ping';
import TestRecovery from './tests/api/environment/testrecovery';
import TestResponseType from './tests/api/environment/testresponsetype';
import TestSwagger from './tests/api/environment/testswagger';
import TestTokenValidation from './tests/api/environment/tokentest';
import TestCaseFileExpressions from './tests/api/expression/testcasefileexpressions';
import TestRepeatWithMapping from './tests/api/expression/testrepeatwithmapping';
import TestStageTaskExpressions from './tests/api/expression/teststagetaskexpressions';
import TestTaskExpressions from './tests/api/expression/testtaskexpressions';
import TestRecursiveDefinitions from './tests/api/repository/testrecursivedefinitions';
import TestRepositoryAPI from './tests/api/repository/testrepositoryapi';
import TestRepeatStage from './tests/api/stage/testrepeatstage';
import TestArraySubCase from './tests/api/task/case/testarraysubcase';
import TestSubCase from './tests/api/task/case/testsubcase';
import TestTaskAPI from './tests/api/task/humantask/testtaskapi';
import TestTaskCountAPI from './tests/api/task/humantask/testtaskcountapi';
import TestTaskFilterAPI from './tests/api/task/humantask/testtaskfilterapi';
import TestTaskFilterAPI2 from './tests/api/task/humantask/testtaskfilterapi2';
import TestTaskValidationAPI from './tests/api/task/humantask/testtaskvalidationapi';
import TestGetListGetDetails from './tests/api/task/process/http/getlistgetdetails';
import TestDashedParameters from './tests/api/task/process/http/testdashedparameters';
import TestInputMappingFailure from './tests/api/task/process/http/testinputmappingfailure';
import TestSMTP from './tests/api/task/process/mail/testsmtp';
import TestProcessTaskMigration from './tests/api/task/process/migration/testprocesstaskmigration';
import TestCalculation from './tests/api/task/process/testcalculation';
import TestTenantRegistration from './tests/api/tenant/testtenantregistration';
import TestVersion from './tests/api/version/testversion';
import TestCompatibility from './tests/compatibility/testcompatibility';
import TestHelloworld from './tests/helloworld/testhelloworld';
import TestIncidentManagement from './tests/incidentmanagement/incidentmanagement';
import TestTravelRequest from './tests/travelrequest/testtravelrequest';
import TestDeleteHelloworld from './tests/api/archiving/testdeletehelloworld';
import TestArchiveHelloworld from './tests/api/archiving/testarchivehelloworld';
import TestFourEyes from './tests/api/task/humantask/testfoureyes';

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
        const t = TestClasses.testList.find(t => (t.name === name.toLowerCase() || t.name === `test${name}`.toLowerCase()));
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
        return this.list.map((test, index) => ` ${index < 9 ? '0' + (index + 1): index + 1} - ${test}\n`).join('');
    }
}

const AllTestCases = new TestClasses([
    PingTokenService
    , PingTestEnvironment
    , TestResponseType
    , TestSwagger
    , TestHelloworld
    , TestVersion
    , TestTenantRegistration
    , TestConsentGroupAPI
    , TestTaskCompletion
    , TestTaskOutputOperations
    , TestTaskBindingRefinement
    , TestEntryCriteriaOnCaseInputParameters
    , TestStage
    , TestTimer
    , TestUsersCaseAPI
    , TestDiscretionaryItems
    , TestStatsAPI
    , TestTaskValidationAPI
    , TestTaskAPI
    , TestTaskFilterAPI
    , TestTaskFilterAPI2
    , TestTaskCountAPI
    , TestTaskWithSpaces
    , TestFourEyes
    , TestDebugMode
    , TestDocumentationAPI
    , TestRepositoryAPI
    , TestRecursiveDefinitions
    , TestTokenValidation
    , TestCaseFileAPI
    , TestCaseFileArrayAPI
    , TestCaseFileExpressions
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
    , TestAuthenticationFlow
    , TestCaseTeamAPI
    , TestCaseTeam
    , TestCaseTeamTenantRoleMembers
    , TestCaseTeamConsentGroupAPI
    , TestCaseTeamTaskAuthorizations
    , TestCaseTeamAuthorizations
    , TestEventAuthorization
    , TestArchiveHelloworld
    , TestArchiveCase
    , TestDeleteCase
    , TestDeleteHelloworld
    , TestDeleteTenant
    , TestDeleteTenantWithContent
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
    , TestDefinitionInStartCase
    , TestCalculation
    , TestGetListGetDetails
    , TestDashedParameters
    , TestInputMappingFailure
    , TestProcessTaskMigration
    , TestCaseMigration
    , TestSubCaseMigration
    , TestRecovery
    , TestCompatibility
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
            const resultString = results.list.length == 0 ? '' : `  Successful tests:\n${results.toString()}\n`;
            throw new TestError(error, `\n\nTest ${i + 1} "${test.name}" failed.\n${resultString}\nTest ${i + 1} "${test.name}" failed.\n${error.constructor.name}: ${error.message}\n`);
        }
    }
    return results;
}

function main() {
    Object.assign(CafienneConfig, Config);
    NextVersion.enable();

    const commandLineTestNames = findTestsFromCommandLineArguments();
    const commandLineTestClasses = commandLineTestNames.map(TestClasses.getTestClass)
    const runDefaultTests = commandLineTestClasses.length > 0 ? false : true;
    const testDeclarations = runDefaultTests ? AllTestCases.list : commandLineTestClasses;

    const startTime = new Date();
    console.log(`=========\n\nStarting ${testDeclarations.length} test cases at ${startTime}\n`);

    runTests(testDeclarations, runDefaultTests).then(results => {
        const endTime = new Date();
        console.log(`\n========= Started ${testDeclarations.length} tests at at ${startTime}\n\n${results.toString()}`);
        console.log(`========= Completed ${testDeclarations.length} test cases in ${((endTime.getTime() - startTime.getTime()) / 1000)} seconds at ${endTime}`);
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
