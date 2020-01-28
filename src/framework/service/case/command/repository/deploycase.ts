/**
 * Interface with fields required to deploy a CMMN case into the Cafienne Engine
 */
export default interface DeployCase {
    /**
     * XML File with the <definitions> in it
     */
    definition: Document;
    /**
     * Tenant in which the case must be deployed.
     * If not given, the defaut tenant of the case system is used.
     */
    tenant?: string;
    /**
     * Filename under which the case will be identified ('.xml' extension is added by the server)
     */
    modelName: string;
}