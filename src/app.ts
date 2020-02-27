import TestCase from './framework/test/testcase';
import TestStatsAPI from './tests/api/case/stats';
import TestUsersCaseAPI from './tests/api/case/usercases';
import TestDiscretionaryItems from './tests/api/discretionary/testdiscretionaryitems';
import TestDebugMode from './tests/api/debug/testdebugmode';
import TestHelloworld from './tests/helloworld/helloworld';
import TestTenantRegistration from './tests/api/tenant/tenantregistration';
import TestTaskValidationAPI from './tests/api/task/taskvalidation';
import pingTestEnvironment from './tests/api/environment/ping';
import Config from './config';
import TestRepositoryAPI from './tests/api/repository/repositorytest';
import TestTokenValidation from './tests/api/environment/tokentest';
import TestCaseFileAPI from './tests/api/casefile/testcasefileapi';
import TestCasePlanAPI from './tests/api/caseplan/testcaseplanapi';
import TestEventAuthorization from './tests/api/caseplan/testeventauthorization';


function findTestsFromCommandLineArguments(): Array<string> {
    const time = process.argv[2];
    if (time && !isNaN(Number(time))) {
        console.log('Setting CQRS wait time to '+time)
        Config.CafienneService.cqrsWaitTime = Number(time);
    }

    // TODO: it will be nice if we can implement running test cases given from command line,
    //  but as of now (because TypeScript transpiling the class names?) they cannot be found in runtime based on string
    const stringList = process.argv.slice(3);
    if (stringList.length > 0) {
        console.log('Command line arguments are not yet supported')
    }
    return [];
}

function getHardCodedTestDeclarations(): Array<any> {
    return [
        TestHelloworld
        , TestUsersCaseAPI
        , TestDiscretionaryItems
        , TestStatsAPI
        , TestTaskValidationAPI
        , TestDebugMode
        , TestTenantRegistration
        , TestRepositoryAPI
        , TestTokenValidation
        , TestCaseFileAPI
        , TestCasePlanAPI
        , TestEventAuthorization
    ];
}

console.log('=========\nCreating test cases\n')
const testDeclarations = getHardCodedTestDeclarations().concat(findTestsFromCommandLineArguments());

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
    await pingTestEnvironment();

    const tests: Array<TestCase> = getTestCaseInstances(testDeclarations);
    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
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
        } catch (error) {
            throw new TestError(error, `\n\nTest ${i+1} "${test.name}" failed. Type of error: ${error.constructor.name}.\nError message: ${error.message}\n\n`);
        }
    }
}

const startTime = new Date();
console.log('=========\n\nStarting test cases at ' + startTime + '\n');

runTests(testDeclarations).then(done => {
    const endTime = new Date();
    console.log('\n=========\n\nTesting completed in ' + (endTime.getTime() - startTime.getTime()) + ' milliseconds at ' + endTime + '\n');
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
