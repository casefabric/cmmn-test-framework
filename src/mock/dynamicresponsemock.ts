import MockServer from "./mockserver";
import PostMock from "./postmock";

export default class DynamicResponseMock extends MockServer {
    mock: PostMock;
    constructor(port: number) {
        super(port);
        this.mock = new PostMock(this, '/get/code/:code', call => {
            const code = Number(call.req.params['code']);
            call.onContent((body: string) => {
                console.log(`Returning ${code} with ${body}`);
                call.res.status(code).write(body);
                call.res.end();
            })
        })
    }
}
