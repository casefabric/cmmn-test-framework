import Config from "../config";
import CafienneService from "../service/cafienneservice";
import TestClasses from "./testclasses";
import TestError from "./testerror";
import TestRunner from "./testrunner";

export default class TestBatch {
    runners: Array<TestRunner> = [];
    startTime: Date = new Date();
    endTime: Date = new Date();
    report: string = '';

    get testCount(): number {
        return this.runners.length;
    }

    constructor(public list: Array<string>) {
        this.runners = TestClasses.createTestRunners(this.list);
    }

    print() {
        console.log(this.report);
    }

    async execute() {
        this.startTime = new Date();
        console.log(`=========\n\nStarting ${this.runners.length} test cases at ${this.startTime}\n`);

        const numParallelTests = Config.TestCase.parallellism;
        if (numParallelTests <= 1) {
            await this.runSequentialTests(this.runners);
        } else {
            // First run the sequential tests
            await this.runSequentialTests(this.runners.filter(run => run.test.isSequentialTest));
            // Split up the parallel tests in batches that must be run sequentially
            await this.runParallelTests(numParallelTests, this.runners.filter(run => run.test.isParallelTest));
        }
        this.endTime = new Date();

        const failedTest = this.runners.find(test => test.error)
        if (failedTest) {
            this.throwFailureReport(failedTest);
        } else {
            this.createReport();
        }
        return this;
    }

    async runSequentialTests(sequentialTests: Array<TestRunner>) {
        for (let i = 0; i < sequentialTests.length; i++) {
            const run = sequentialTests[i];
            await run.execute();

            if (run.error) {
                this.throwFailureReport(run);
                break;
            }
        }
    }

    async runParallelTests(numParallelTests: number, parallelTests: Array<TestRunner>) {
        // Split up the parallel tests in batches that must be run sequentially
        const batches: Array<Array<TestRunner>> = [];
        while (parallelTests.length) batches.push(parallelTests.splice(0, numParallelTests));

        const batchRunner = async (batch: Array<TestRunner>) => {
            const promises: Array<Promise<void>> = batch.map(run => run.execute());
            await Promise.all(promises);    
        }

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            try {
                await batchRunner(batch);
            } catch (e) {
                return;
            }
        }
    }

    resultPrinter() {
        const completedTests = this.runners.filter(run => run.completed);
        return completedTests.map(result => result.toString()).join('\n') + 
        `\n\n========= Completed ${completedTests.length} test cases and ${CafienneService.calls} API calls in ${((this.endTime.getTime() - this.startTime.getTime()) / 1000)} seconds at ${this.endTime}\n`;
    }

    throwFailureReport(run: TestRunner) {
        const completedTests = this.runners.filter(run => run.completed);

        const resultString = this.runners.length == 0 ? '' : `  Successful tests:\n${this.resultPrinter()}\n`;
        const msg = `\nTest ${run.testNumber} "${run.name}" failed.\n${resultString}${run}\nTest ${run.testNumber} "${run.name}" failed.\n`;
        throw new TestError(run.error, msg);
    }

    createReport() {
        this.report = (`\n========= Started ${this.runners.length} tests at at ${this.startTime}\n\n${this.resultPrinter()}`);
    }
}
