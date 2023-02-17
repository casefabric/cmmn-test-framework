
/**
 * Wrapper for the ColumnDetails api  
 */
export default interface ColumnDetails {
    /**
     * Title of the board to create
     */
    title: string;
    /**
     * Optional id for the board to create.
     * If not specified, the server will create one.
     */
    id?: string;

    form?: object;
}