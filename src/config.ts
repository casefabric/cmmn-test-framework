const Config = {
    CafienneService: {
        // URL of backend engine
        url: 'http://localhost:2027/',
        log: {
            // Whether or not to log HTTP call information (user, url, method type, headers)
            url: false, // URL includes call number, method type and user id
            request: {
                headers: false, // Shows request headers
                body: false, // Shows request body
            },
            response: {
                status: false, // Shows response statusCode and statusMessage, including call number 
                headers: false, // Shows response headers
                body: false // Shows response body
            }
        },
        // CQRS Wait Time is the time the engine needs to process events from commands (e.g. StartCase, CompleteTask, CreateTenant) into the server side query database
        cqrsWaitTime: 5000
    },
    TokenService: {
        // URL of token service
        url: 'http://localhost:2377/token',
        // Issuer can be configured. The issuer must equal what is configure inside the Cafienne Engine
        issuer: 'Cafienne Test Framework',
        // Whether or not to show the tokens requested and updated in the user
        log: false
    },
    MockService: {
        // Whether or not to show log messages on the console from the mock service
        log: true,
        registration: true, // To show registration of mocks
        response: true // Better not use this
    },
    PlatformService: {
        // Whether or not to show log messages on the console from the platform APIs (e.g., whether tenant already exists or not)
        log: false
    },
    RepositoryService: {
        // Whether or not to show log messages on the console from the repository APIs (e.g., list of case definitions returned from server)
        log: false,
        repository_folder: './casemodels/bin'
    },
    TestCase: {
        // Whether or not to show log messages on the console (e.g. wait time messages for server side processing)
        log: false
    }
}

export default Config;

