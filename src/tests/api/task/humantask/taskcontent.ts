export default class TaskContent {
    static TaskOutputDecisionCanceled = { Decision: 'Cancel the order' };
    static TaskOutputDecisionApproved = { Decision: 'Order Approved' };
    static TaskOutputInvalidDecision = { Decision: 'a;sldkjfas;l'};
    static TaskOutputThatFailsValidation = { Decision: 'KILLSWITCH'};
    static InvalidDecisionResponse = { Status: 'NOK', details: `Field 'decision' has an improper value`};    
}