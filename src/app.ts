import TestCase from './framework/test/testcase';
import TestStatsAPI from './tests/api/case/stats';
import TestUsersCaseAPI from './tests/api/case/usercases';
import TestDiscretionaryItems from './tests/api/discretionary/testdiscretionaryitems';
import TestDebugMode from './tests/api/debug/testdebugmode';
import TestHelloworld from './tests/helloworld';
import TestTenantRegistration from './tests/tenantregistration';

const testDeclarations = [
    TestHelloworld
    , TestUsersCaseAPI
    
    // Test currently fails for some unclear reason. Perhaps an engine bug?!
    // , TestStatsAPI

    // // For now, TestDiscretionaryItems is commented out, because planning.xml is not deployed by default
    // // , TestDiscretionaryItems
    , TestDebugMode
    , TestTenantRegistration
];

console.log('=========\nCreating test cases\n')

function getTestCaseInstances(testDeclarations: Array<any>) {
    return testDeclarations.map(test => {
        if (test instanceof TestCase) return test;
        if (typeof (test) === 'function') {
            return new test();
        }
        throw new Error('Test ' + test + ' of type "' + typeof (test) + '" cannot be converted to a TestCase');

    });
}

async function runTests(testDeclarations: Array<any>) {
    const tests: Array<TestCase> = getTestCaseInstances(testDeclarations);
    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        const calculatedWhitespace = '                            '.substring(test.name.length)
        try {
            console.log(`\n
                        #######################################################
                        #                                                     #
                        #      PREPARING TEST:  "${test.name}"${calculatedWhitespace}#
                        #                                                     #
                        #######################################################
                        `);
            const preparationDone = await test.onPrepareTest();
            console.log(`\n
                        #######################################################
                        #                                                     #
                        #       STARTING TEST:  "${test.name}"${calculatedWhitespace}#
                        #                                                     #
                        #######################################################
                        `);
            const testRun = await test.run();
            console.log(`\n
                        #######################################################
                        #                                                     #
                        #        CLOSING TEST:  "${test.name}"${calculatedWhitespace}#
                        #                                                     #
                        #######################################################
                        `);
            const closeDone = await test.onCloseTest();
        } catch (error) {
            throw {
                test: test.name,
                number: i+1,
                error                
            }
        }
    }
}

const startTime = new Date();
console.log('=========\nStarting test cases at ' + startTime + '\n');

runTests(testDeclarations).then(done => {
    const endTime = new Date();
    console.log('=========\nTesting completed in ' + (endTime.getTime() - startTime.getTime()) + ' milliseconds at ' + endTime + '\n');
}).catch(e => {
    console.error(`\n\nTest ${e.number} "${e.test}" failed with error\n\n`, e.error);
    return;
});

