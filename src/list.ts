import CommandLineParser from './commandlineparser';
import TestBatch from './infra/testbatch';

// First parse the command line and set config parameters, before loading the TestBatch.
//  The reason is that "import TestBatch" loads all test class code, including static scripts that
//  may vary based on command line args (specifically default tenant)
try {
    const commandLine = new CommandLineParser();
    // Just print the test names and exit.
    new TestBatch(commandLine.testNames).runners.forEach((run, index) => console.log(`${index + 1}: ${run.name}`));
    process.exit(0);
} catch (error) {
    if (error instanceof Error) {
        console.log(`\n${error.message}\n`);
    } else {
        console.log('Ran into some unknown failure', error);
    }
    process.exit(-1);
}
