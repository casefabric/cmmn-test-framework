import CommandLineParser from './commandlineparser';
import TestBatch from './infra/testbatch';

try {
    const args = new CommandLineParser();
    const commandLineTestNames = args.testNames;
    new TestBatch(commandLineTestNames).execute().then(batch => {
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
