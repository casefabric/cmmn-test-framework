/**
 * Base class to expose possible TaskStates of plan items and case file items.
 */
export default class TaskState {
    public static readonly Null = new TaskState('Null');
    public static readonly Unassigned = new TaskState('Unassigned');
    public static readonly Assigned = new TaskState('Assigned');
    public static readonly Delegated = new TaskState('Delegated');
    public static readonly Completed = new TaskState('Completed');
    public static readonly Suspended = new TaskState('Suspended');
    public static readonly Terminated = new TaskState('Terminated');

    private static states = [TaskState.Null, TaskState.Unassigned, TaskState.Assigned, TaskState.Delegated, TaskState.Completed, TaskState.Suspended, TaskState.Terminated];

    public static of(value: string | TaskState): TaskState {
        if (value instanceof TaskState) return value;
        for (const state of TaskState.states) {
            if (state.value?.toLowerCase() === value.toLowerCase()) {
                return state;
            }
        }
        throw new Error(`${value} is not a valid TaskState`);
    }

    private constructor(public readonly value: string) {
    }

    is(other: string | TaskState | undefined | null): boolean {
        if (! other) return false;
        return this.value.toLowerCase() === other.toString().toLowerCase();
    }

    toString() {
        return this.value;
    }
}
