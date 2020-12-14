import QueryFilter from "../queryfilter";

/**
 * Query to get a list of tasks, with a set of optional filters on it.
 */
export default interface TaskFilter extends QueryFilter {
    /**
     * Only fetch tasks from this tenant
     */
    tenant?: string,
    /**
     * Only fetch tasks matching these business identifiers
     */
    identifiers?: string,
    /**
     * Filter tasks that have a case definition with this name
     */
    caseName?: string,
    /**
     * Filter tasks that have this name
     */
    taskName?: string,
    /**
     * Filter tasks for this assignee
     */
    assignee?: string,
    /**
     * Filter tasks of this owner
     */
    owner?: string,
    /**
     * Filter tasks with the specified state
     */
    taskState?: string,
    /**
     * Filter tasks with the specified due date (format yyyy-mm-dd)
     */
    dueOn?: string,
    /**
     * Filter tasks that have a due date before the specified due date (format yyyy-mm-dd)
     */
    dueBefore?: string,
    /**
     * Filter tasks that have a due date after the specified due date (format yyyy-mm-dd)
     */
    dueAfter?: string,
    /**
     * Timezone offset. Not sure what it is supposed to do.
     */
    timeZone?: string,
    /**
     * List tasks from this offset (defaults to 0)
     */
    offset?: number,
    /**
     * List only this number of tasks (defaults to 100)
     */
    numberOfResults?: number,
    /**
     * Sort tasks by this field
     */
    sortBy?: string,
    /**
     *  Sort order, either 'ASC' or 'DESC'
     */
    sortOrder?: string
}

