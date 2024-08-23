import Config from "../config";

export default class TestConfiguration {
    public repository = Config.RepositoryService.repository_folder + '/../src';
    public deploy = Config.RepositoryService.repository_folder;
    public backendUrl = Config.CafienneService.url.substring(0, Config.CafienneService.url.length - 1);

    constructor() {
        console.log("Test Configuration on backend " + this.backendUrl)
    }
}
