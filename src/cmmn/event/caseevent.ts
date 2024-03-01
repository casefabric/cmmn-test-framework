export default class CaseEvent {
    public static readonly TaskInputFilled: string = 'TaskInputFilled';
    public static readonly HumanTaskActivated: string = 'HumanTaskActivated';
    public static readonly HumanTaskInputSaved: string = 'HumanTaskInputSaved';
    public static readonly CaseModified: string = 'CaseModified';
    public static readonly DebugEvent: string = 'DebugEvent';
    public static readonly PlanItemCreated: string = 'PlanItemCreated';
    public static readonly PlanItemTransitioned: string = 'PlanItemTransitioned';
    public static readonly RepetitionRuleEvaluated: string = 'RepetitionRuleEvaluated';
    public static readonly RequiredRuleEvaluated: string = 'RequiredRuleEvaluated';
    public static readonly CaseDefinitionMigrated: string = 'CaseDefinitionMigrated';
    public static readonly PlanItemMigrated: string = 'PlanItemMigrated';
    public static readonly PlanItemDropped: string = 'PlanItemDropped';
    public static readonly HumanTaskDropped: string = 'HumanTaskDropped';
}
