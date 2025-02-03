import Trace from "../../infra/trace";
import RepositoryService from "../../service/case/repositoryservice";
import Tenant from "../../tenant/tenant";
import User from "../../user";

export default class Definition {
    isDeployed: boolean = false;
    constructor(public file: string) { }

    toString() {
        return this.file;
    }

    async deploy(user: User, tenant: string | Tenant, trace: Trace = new Trace()) {
        if (!this.isDeployed) {
            await RepositoryService.validateAndDeploy(user, this.file, tenant, trace);
        }
        this.isDeployed = true;
    }
}
