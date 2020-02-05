const Config = {
    CafienneService: {
        // URL of backend engine
        url: 'http://localhost:2027/',
        log: {
            // Whether or not to log HTTP call meta information (user, url, method type, headers)
            traffic: true,
            // Whether or not to log HTTP call content (body)
            content: true
        },
        // CQRS Wait Time is the time the engine needs to process events from commands (e.g. StartCase, CompleteTask, CreateTenant) into the server side query database
        cqrsWaitTime: 5000
    },
    TokenService: {
        // URL of token service
        url: 'http://localhost:2377/token',
        // Issuer can be configured. The issuer must equal what is configure inside the Cafienne Engine
        issuer: 'Cafienne Test Framework'
    },
    RepositoryService: {
        // Whether or not to show log messages on the console from the repository APIs (e.g., list of case definitions returned from server)
        log: true
    },
    TestCase: {
        // Whether or not to show log messages on the console (e.g. wait time messages for server side processing)
        log: true
    }
}

export default Config;

