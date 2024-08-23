import { error } from "console";
import Definitions from "../cmmn/definitions/definitions";
import TestConfiguration from "./testconfiguration";
import {Repository} from '@cafienne/repository';
import {Backend} from '@cafienne/repository';




export default class Deploy {
    repository = new Repository(new TestConfiguration());
    caseService = new Backend(new TestConfiguration().backendUrl);

    constructor(public includeValidation: boolean = false) {

    }

    async execute(...sources: string[]) {
        if (sources.length === 0) {
            console.log("Deploying all sources that are defined in the 'Definitions' class");
            const definitionFilter = (value: any):boolean => value.indexOf('.xml') === value.length - 4;
            sources.push(...Object.keys(Definitions).map(key => ''+(<any>Definitions)[key]).filter(definitionFilter));
        }
        for (const source of sources) {
            await this.deploy(source);
        }

        return this;
    }

    async deploy(source: string) {
        console.group("Deploying " + source);
        if (source.indexOf('.xml') === source.length - 4) {
            source = source.substring(0, source.length - 4) + '.case';
        }
        console.log("- Running deploy on " + source);
        this.repository.deploy(source);
        if (this.includeValidation) {
            console.log("- Running validate on " + source);

            const definitionsXML = this.repository.composeDefinitionsDocument(source);
            if (definitionsXML.hasErrors()) {
                console.log(`Case ${source} has errors when compiling it to XML`)
                console.groupEnd();
                return;
            }
            
            await this.caseService.validate(definitionsXML.deployContents).then((response: any) => {
                console.log("Successful validation of " + source);
                console.groupEnd();
                return;
            }).catch((error: any) => {
                if (error !== undefined) {
                    if (error.response) {
                        if (error.response.status === 400) {
                            console.log(source + " has an invalid definition " + error.response.data);
                            console.groupEnd();
                            return;
                        }    
                    }
                }
                console.groupEnd();
                throw error;
            })
        } else {
            console.log("Deployed " + source);
            console.groupEnd();
        }
    }

    print() {

    }
}
