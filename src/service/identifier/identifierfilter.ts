/**
 * Query to get a list of identifiers.
 */
export default interface IdentifierFilter {
    /**
     * Only fetch identifiers within this tenant
     */
    tenant?: string,
    /**
     * Only fetch identifiers with this name
     */
    name?: string,
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
