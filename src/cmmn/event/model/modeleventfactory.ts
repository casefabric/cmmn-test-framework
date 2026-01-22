import { addType } from "../../../util/json";
import CaseEngineEvent from "../caseengineevent";
import CaseModified from "./case/casemodified";
import CaseDefinitionApplied from "./case/definition/casedefinitionapplied";
import CaseDefinitionMigrated from "./case/migration/casedefinitionmigrated";
import HumanTaskDropped from "./case/migration/humantaskdropped";
import PlanItemDropped from "./case/migration/planitemdropped";
import PlanItemMigrated from "./case/migration/planitemmigrated";
import { RepetitionRuleEvaluated } from "./case/plan/expression/repetitionruleevaluated";
import { RequiredRuleEvaluated } from "./case/plan/expression/requiredruleevaluated";
import { PlanItemCreated } from "./case/plan/planitemcreated";
import PlanItemTransitioned from "./case/plan/planitemtransitioned";
import { HumanTaskActivated } from "./case/plan/task/humantaskactivated";
import HumanTaskInputSaved from "./case/plan/task/humantaskinputsaved";
import TaskInputFilled from "./case/plan/task/taskinputfilled";
import TaskOutputFilled from "./case/plan/task/taskoutputfilled";
import { DebugEvent } from "./debugevent";
import EngineVersionChanged from "./engineversionchanged";
import ModelEvent from "./modelevent";

export default class ModelEventFactory {
    static getConstructor(type: string): typeof ModelEvent | null {
        const f = events.find(c => c.name === type);
        if (f) {
            return f;
        }
        return null;
    }

    static parse(caseEngineEvent: CaseEngineEvent): ModelEvent {
        const f = ModelEventFactory.getConstructor(caseEngineEvent.type);
        // console.log('Parsing ModelEvent of type ' + caseEngineEvent.type + (f ? ' using specific constructor ' + f.name : ' using generic ModelEvent'));
        const payload = addType(caseEngineEvent.content, f ? f : ModelEvent);
        payload.engineEvent = caseEngineEvent;
        return payload;
    }
}

const events = [
    DebugEvent,
    TaskInputFilled,
    TaskOutputFilled,
    HumanTaskActivated,
    HumanTaskInputSaved,
    CaseModified,
    PlanItemCreated,
    PlanItemTransitioned,
    RepetitionRuleEvaluated,
    RequiredRuleEvaluated,
    CaseDefinitionMigrated,
    CaseDefinitionApplied,    
    PlanItemMigrated,
    PlanItemDropped,
    HumanTaskDropped,
    EngineVersionChanged,
]
