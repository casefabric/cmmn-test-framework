export default class TaskContent {
    static TaskOutputDecisionCanceled = { Decision: 'Cancel the order' };
    static TaskOutputDecisionApproved = { Decision: 'Order Approved' };
    static TaskOutputInvalidDecision = { Decision: 'a;sldkjfas;l' };
    static TaskOutputThatFailsValidation = { Decision: 'KILLSWITCH' };
    static InvalidDecisionResponse = { Status: 'NOK', details: `Field 'decision' has an improper value` };
    static TaskOutputInvalidIntegerProperty = {
        Decision: {
            anyProperty: "string",
            integerProperty: "3",
            booleanProperty: false,
            stringProperty: true,
            timeProperty: "21:32:52"
        }
    };
    static TaskOutputInvalidBooleanProperty = {
        Decision: {
            anyProperty: "string",
            integerProperty: 3,
            booleanProperty: "false",
            stringProperty: true,
            timeProperty: "21:32:52"
        }
    };
    static TaskOutputInvalidTimeProperty = {
        Decision: {
            anyProperty: "string",
            integerProperty: 3,
            booleanProperty: false,
            stringProperty: true,
            timeProperty: "21s:32:52"
        }
    };
    static TaskOutputValidProperties = {
        Decision: {
            anyProperty: "string",
            integerProperty: 3,
            booleanProperty: false,
            stringProperty: true,
            timeProperty: "21:32:52"
        }
    };
}