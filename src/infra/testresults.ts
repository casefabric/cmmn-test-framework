import TestRunner from "./testrunner";

export default class TestResults {
    list: Array<TestRunner> = [];
    constructor() { }
    addTest(result: TestRunner) {
        this.list.push(result);
    }

    toString() {
        return this.list.map((test, index) => ` ${index < 9 ? '0' + (index + 1): index + 1} - ${test}\n`).join('');
    }
}
