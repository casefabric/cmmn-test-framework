
/**
 * Wrapper for the ColumnDefinition format  
 */
export default class ColumnDefinition {
    public tasks: Array<any> = [];

    constructor(public title: string, public form: object | undefined = undefined, public role: string | undefined = undefined, public id: string | undefined = undefined) { }

    toJson() {
        return { title: this.title, form: this.form, role: this.role, id: this.id };
    }

    toString() {
        return this.id;
    }
}
