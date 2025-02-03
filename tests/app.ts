import CommandLineParser from './commandlineparser';

// First parse the command line and set config parameters, before loading the TestBatch.
//  The reason is that "import TestBatch" loads all test class code, including static scripts that
//  may vary based on command line args (specifically default tenant)
let commandLine = undefined;
try {
    commandLine = new CommandLineParser();
} catch (error) {
    if (error instanceof Error) {
        console.log(`\n${error.message}\n`);
    } else {
        console.log('Ran into some unknown failure', error);
    }
    process.exit(-1);
}

import TestBatch from './testbatch';

try {
    new TestBatch(commandLine.testNames).execute().then(batch => {
        batch.print();
        process.exit(0)
    }).catch(e => {
        console.error(e);
        process.exit(-1);
    });
} catch (error) {
    if (error instanceof Error) {
        console.log(error.message);
    } else {
        console.log('Ran into some unknown failure', error);
    }
    process.exit(-1);
}
