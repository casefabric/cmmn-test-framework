/**
 * Base for QueryFilters. Queries to the case services can be extended with optional parameters.
 * See also: @TaskFilter and @link CaseFilter.
 */
export default interface QueryFilter {
}

/**
 * Extends the url with the available parameters inside the query filter
 * @param url The url to be extended, e.g. /tasks will become /tasks?taskState=Completed&
 * @param filter QueryFilter, e.g. TaskFilter { 'taskState' : 'Completed' }
 */
export function extendURL(url: string, filter: QueryFilter): string {
    const json = JSON.parse(JSON.stringify(filter));
    if (! url.endsWith('?')) url = url + '?';
    for (const field in json) {
        const value = json[field];
        url += field + '=' + value + '&';
    }
    return url;
}
