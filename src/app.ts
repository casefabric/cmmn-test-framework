import Config from './config';
import TestBatch from './infra/testbatch';

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

try {
    const commandLineTestNames = findTestsFromCommandLineArguments();
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
