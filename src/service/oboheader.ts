import { RequestHook } from "./caseengineservice";
import CaseEngineRequest from "./request";

export const OBO_HEADER_NAME = 'On-Behalf-Of';
export default class OBO_HEADER extends RequestHook {
    private oboUserId: string = '';

    get value() {
        return this.oboUserId;
    };

    set value(newValue: string) {
        if (newValue && newValue !== this.oboUserId) {
            console.log('Setting OBO header to: ' + newValue);
        } else {
            console.log('Clearing OBO header');
        }
        this.oboUserId = newValue;
    }

    before(request: CaseEngineRequest): void {
        if (this.value) {
            request.headers[OBO_HEADER_NAME] = this.value;
        } else {
            delete request.headers[OBO_HEADER_NAME];
        }
    }
}
