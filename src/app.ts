import TestHelloworld from './tests/helloworld';
import TestTenantRegistration from './tests/tenantregistration';


console.log('=========\nCreating test cases\n')

const helloworld = new TestHelloworld();
const tenantRegistration = new TestTenantRegistration();

const startTime = new Date();
console.log('=========\nStarting test cases at '+startTime+'\n');
tenantRegistration.run().then(() => {
    helloworld.run().then(() => {
        const endTime = new Date();
        console.log('=========\nTesting completed in '+ (endTime.getTime() - startTime.getTime())+' milliseconds at '+endTime+'\n');
    });
});

