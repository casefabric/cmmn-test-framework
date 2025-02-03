import Definition from "../../cmmn/definitions/definition";
import QueryFilter from "../queryfilter";

/**
 * Query to get a list of cases, with a set of optional filters on it.
 */
export default interface CaseFilter extends QueryFilter {
    /**
     * Only fetch case instances within this tenant
     */
    tenant?: string,
    /**
     * Only fetch cases matching these business identifiers
     */
    identifiers?: string,
    /**
     * Filter instances that have this definition as their name
     */
    definition?: string | Definition,
    /**
     * Filter instances in the specified state
     */
    state?: string,
    /**
     * List instances from this offset onwards (defaults to 0)
     */
    offset?: number,
    /**
     * List no more than this number of instances (defaults to 100)
     */
    numberOfResults?: number,
    /**
     * Sort cases by this field
     */
    sortBy?: string,
    /**
     *  Sort order, either 'ASC' or 'DESC'
     */
    sortOrder?: string
}
