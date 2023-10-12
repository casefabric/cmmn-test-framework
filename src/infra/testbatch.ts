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
        for (let i = 0; i < this.runners.length; i++) {
            const run = this.runners[i];
            await run.execute();

            if (run.error) {
                break;
            }
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
    
    resultPrinter() {
        return this.runners.filter(run => run.completed).map(result => result.toString()).join('\n');
    }

    throwFailureReport(run: TestRunner) {
        const resultString = this.runners.length == 0 ? '' : `  Successful tests:\n${this.resultPrinter()}\n`;
        const msg = `\nTest ${run.testNumber} "${run.name}" failed.\n${resultString}${run}\n`;
        throw new TestError(run.error, msg);
    }

    createReport() {
        this.report = (`\n========= Started ${this.runners.length} tests at at ${this.startTime}\n\n${this.resultPrinter()}`);
        this.report += (`\n\n========= Completed ${this.runners.length} test cases and ${CafienneService.calls} API calls in ${((this.endTime.getTime() - this.startTime.getTime()) / 1000)} seconds at ${this.endTime}\n`);
    }
}
