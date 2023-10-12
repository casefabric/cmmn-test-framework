import TestCase from "../test/testcase";

export default class TestRunner {
    name: string = this.testClass.name;
    calculatedWhitespace = '                                         '.substring(this.name.length);
    test: TestCase;
    started: Date = new Date();
    ended: Date = new Date();
    summary: string = '';
    error: unknown = undefined;
    testNumber: number = 0;

    running: boolean = false;
    completed: boolean = false;

    constructor(public testClass: Function, public isExplicitlyMentionedTest: boolean = false) {
        try {
            const constructor: any = this.testClass;
            this.test = new constructor();
        } catch (e) {
            throw new Error(`Unknown failure while running constructor of ${this.name}:\n${e}`);
        }
    }

    needsRunning() {
        return this.isExplicitlyMentionedTest || this.test.isDefaultTest;
    }

    async execute() {
        try {
            await this.prepare();
            await this.run();
            await this.close();    
        } catch (error) {
            this.failed(error);
        }
    }

    async prepare() {
        console.log(`\n
####################################################################
#                                                                  #
#      PREPARING TEST:  "${this.name}"${this.calculatedWhitespace}#
#                                                                  #
####################################################################
                        `);
        await this.test.onPrepareTest();
    }

    async run() {
        this.running = true;
        this.started = new Date();
        console.log(`\n
####################################################################
#                                                                  #
#      STARTING TEST:   "${this.name}"${this.calculatedWhitespace}#
#                                                                  #
####################################################################
                        `);
        await this.test.run();
    }

    async close() {
        console.log(`\n
####################################################################
#                                                                  #
#      CLOSING TEST:    "${this.name}"${this.calculatedWhitespace}#
#                                                                  #
####################################################################
                        `);
        await this.test.onCloseTest();
        this.finished();
    }

    finished() {
        this.ended = new Date();
        this.completed = true;
        if (this.test.identifiers.length) {
            this.summary = `  ---  [ ${this.test.identifiers.join(' | ')} ]`
        }
        this.ended = new Date();
    }

    failed(error: unknown) {
        this.ended = new Date();
        this.error = error;
        if (this.test.identifiers.length) {
            this.summary = `  ---  [ ${this.test.identifiers.join(' | ')} ]`
        }
        this.ended = new Date();
    }

    toString() {
        return this.report();
    }

    report() {
        const indexString = `${this.testNumber < 0 ? '0' : ''}${this.testNumber}`;
        if (this.error) {
            return ` ${indexString} - ${this.name} ${this.summary} failed after ${(this.ended.getTime() - this.started.getTime())} ms`;
        } else {
            return ` ${indexString} - ${this.name} (${(this.ended.getTime() - this.started.getTime())} ms) ${this.summary}`;
        }
    }
}
