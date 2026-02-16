import User from "../user";

export default class CaseEngineRequest {
    constructor(public user: User | undefined, public url: string, public method: string, public headers: any, public body: any) { }
}
