import TestHelloworld from './tests/helloworld';
import TestTenantRegistration from './tests/tenantregistration';
import TestCase from './framework/test/testcase';

const testDeclarations = [
    new TestHelloworld()
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
        console.log('\n========== Preparing test ' + test.name + "\n");
        const preparationDone = await test.onPrepareTest();
        console.log('Starting test ' + test.name + "\n");
        const testRun = await test.run();
        console.log('Closing test ' + test.name);
        const closeDone = await test.onCloseTest();
    }
}

const startTime = new Date();
console.log('=========\nStarting test cases at ' + startTime + '\n');

runTests(testDeclarations).then(done => {
    const endTime = new Date();
    console.log('=========\nTesting completed in ' + (endTime.getTime() - startTime.getTime()) + ' milliseconds at ' + endTime + '\n');
}).catch(e => {
    console.error(e);
    return;
});

// // const helloworld = new TestHelloworld();
// // const tenantRegistration = new TestTenantRegistration();

// // tenantRegistration.run().then(() => {
//     helloworld.run().then(() => {
//     });
// // });

