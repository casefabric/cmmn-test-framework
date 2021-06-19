import CMMNBaseClass from "../../../cmmn/cmmnbaseclass";
import DiscretionaryItem from "../../../cmmn/discretionaryitem";

/**
 * Simple JSON interface wrapper
 */
export class DiscretionaryItemsResponse extends CMMNBaseClass {
    constructor(
        public caseInstanceId: string,
        public name: string,
        public discretionaryItems: Array<DiscretionaryItem>,
    ) { super(); }
}
