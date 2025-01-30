import { Document } from "@xmldom/xmldom";

/**
 * Interface with fields required to deploy a CMMN case into the Cafienne Engine
 */
export default class DeployCase {
    /**
     * 
     * @param definition XML File with the <definitions> in it
     * @param modelName Filename under which the case will be identified ('.xml' extension is added by the server)
     * @param tenant Tenant in which the case must be deployed. If not given, the defaut tenant of the case system is used.
     */
    constructor(
        public definition: Document,
        public modelName: string,
        public tenant?: string,
    ) { }
}