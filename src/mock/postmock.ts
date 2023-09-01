import MockURL from "./mockurl";

export default class PostMock extends MockURL {
    addRoute() {
        this.mockServer.express.post(this.url, (req, res, next) => this.handleRoute(req, res, next));
    }
}

