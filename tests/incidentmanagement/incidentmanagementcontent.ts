export default class IncidentContent {
    static inputs = {
        Case_Incident: {
            Title: 'Docker Instance',
            Description: 'Need docker instance to run containers'
        }
    };
    static firstTaskInput = {
        Task_Incident: {
            Title: 'Docker Instance',
            Description: 'Need docker instance to run containers'
        }
    };
    static verifyDetailsInputs = {
        Task_Incident: {
            Title: 'Docker Instance',
            Description: 'Need docker instance to run containers',
            Type: 'Quarterly_Statement'
        },
        Incident_Response: {
            Status: 'Needs_further_analysis'
        }
    };
    static verifyDetailsInputsInvalidCase = {
        Task_Incident: {
            Title: 'Docker Instance',
            Description: 'Need docker instance to run containers',
            Type: 'Quarterly_Statement'
        },
        Incident_Response: {
            Status: 'Invalid'
        }
    };
    static secondTaskInput = {
        Task_Incident2: {
            Title: 'Docker Instance',
            Description: 'Need docker instance to run containers',
            Type: 'Quarterly_Statement'
        },
        Incident_Response2: {
            Status: 'Needs_further_analysis'
        }
    };
    static finalTaskOutput = {
        Task_Incident2: {
            Title: 'Docker Instance',
            Description: 'Need docker instance to run containers',
            Type: 'Quarterly_Statement'
        },
        Incident_Response2: {
            Status: 'Fixed'
        }
    };
}