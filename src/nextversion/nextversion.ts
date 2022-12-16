import TestCase from "@cafienne/typescript-client/test/testcase";
import LineReader from "./linereader";

export default class NextVersion {
    static enable() {
    }
}

export class TestCaseExtension extends TestCase {
    lineReaderEnabled = false;
    private reader: LineReader = new LineReader();

    constructor() {
       super(); 
    }

    readLine(question: string = 'Press enter to continue'): string {
        return this.reader.question(question, this.lineReaderEnabled);
    }
}