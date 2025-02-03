import DynamicResponseMock from "../../../../src/mock/dynamicresponsemock";

export default class SimpleDataMock extends DynamicResponseMock {
    constructor(public port: number = 2491) {
        super(port);
    }

    get error_data() {
        return {
            port: this.port,
            payload: "Unauthorized",
            responseCode: 401
        }
    }

    get success_data() {
        return {
            port: this.port,
            payload: "OK",
            responseCode: 200
        }
    }
}
