
export default class TestError extends Error {
    constructor(public error: unknown, message: string) {
        super(`${message}\n${error}`);
    }
}
