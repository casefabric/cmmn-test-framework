/**
 * Base class to expose possible states of plan items and case file items.
 */
export default class State {
    public static readonly Null = new State('Null');
    public static readonly Active = new State('Active');
    public static readonly Available = new State('Available');
    public static readonly Closed = new State('Closed');
    public static readonly Completed = new State('Completed');
    public static readonly Disabled = new State('Disabled');
    public static readonly Discarded = new State('Discarded'); // Special case for case file item
    public static readonly Enabled = new State('Enabled');
    public static readonly Failed = new State('Failed');
    public static readonly Suspended = new State('Suspended');
    public static readonly Terminated = new State('Terminated');

    private static states = [State.Null, State.Active, State.Available, State.Closed, State.Completed, State.Disabled, State.Discarded, State.Enabled, State.Failed, State.Suspended, State.Terminated];

    public static of(value: string | State): State {
        if (value instanceof State) return value;
        for (const state of State.states) {
            if (state.value.toLowerCase() === value.toLowerCase()) {
                return state;
            }
        }
        throw new Error(`${value} is not a valid State`);
    }

    private constructor(public readonly value: string) {
    }

    is(other: string | State | undefined | null): boolean {
        if (! other) return false;
        return this.value.toLowerCase() === other.toString().toLowerCase();
    }

    toString() {
        return this.value;
    }
}
