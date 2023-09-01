export class CaseStatistics {
    constructor(
        public definition: string,
        public totalInstances: number,
        public numActive: number,
        public numCompleted: number,
        public numTerminated: number,
        public numSuspended: number,
        public numFailed: number,
        public numClosed: number,
        public numWithFailures: number) { }

    toString() {
        return `definition[${this.definition}]: total = ${this.totalInstances} active = ${this.numActive} closed = ${this.numClosed} completed = ${this.numCompleted} failed = ${this.numFailed} suspended = ${this.numSuspended} terminated = ${this.numTerminated} withFailures = ${this.numWithFailures}`;
    }
}
