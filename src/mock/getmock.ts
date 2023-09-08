import MockURL from "./mockurl";

export default class GetMock extends MockURL {
    addRoute() {
        this.mockServer.express.get(this.url, (req, res, next) => this.handleRoute(req, res, next));
    }
}