/**
 * Fixed list of all possible transitions that can be invoked on a plan item.
 */
export default class Transition {
    public static readonly Close = new Transition('close');
    public static readonly Complete = new Transition('complete');
    public static readonly Create = new Transition('create');
    public static readonly Disable = new Transition('disable');
    public static readonly Enable = new Transition('enable');
    public static readonly Exit = new Transition('exit');
    public static readonly Fault = new Transition('fault');
    public static readonly ManualStart = new Transition('manualStart');
    public static readonly None = new Transition('');
    public static readonly Occur = new Transition('occur');
    public static readonly ParentResume = new Transition('parentResume');
    public static readonly ParentSuspend = new Transition('parentSuspend');
    public static readonly ParentTerminate = new Transition('parentTerminate');
    public static readonly Reactivate = new Transition('reactivate');
    public static readonly Reenable = new Transition('reenable');
    public static readonly Resume = new Transition('resume');
    public static readonly Start = new Transition('start');
    public static readonly Suspend = new Transition('suspend');
    public static readonly Terminate = new Transition('terminate');

    private static transitions = [Transition.Close, Transition.Complete, Transition.Create, Transition.Disable, Transition.Enable, Transition.Exit, Transition.Fault, Transition.ManualStart, Transition.None, Transition.Occur, Transition.ParentResume, Transition.ParentSuspend, Transition.ParentTerminate, Transition.Reactivate, Transition.Reenable, Transition.Resume, Transition.Start, Transition.Suspend, Transition.Terminate];

    public static of(value: string | Transition): Transition {
        if (value instanceof Transition) return value;
        for (const transition of Transition.transitions) {
            if (transition.value.toLowerCase() === value.toLowerCase()) {
                return transition;
            }
        }
        throw new Error(`${value} is not a valid State`);
    }

    private constructor(public readonly value: string) {
    }

    is(other: string | Transition | undefined | null): boolean {
        if (! other) return false;
        return this.value.toLowerCase() === other.toString().toLowerCase();
    }

    toString() {
        return this.value;
    }
}