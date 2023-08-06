const Config = {
    Log: {
        level: 'DEBUG',
        color: {
            debug: '\x1b[0m%s\x1b[0m', // debug logging is white
            info: '\x1b[32m%s\x1b[0m', // green
            warn: '\x1b[33m%s\x1b[0m', // orange
            error: '\x1b[31m%s\x1b[0m' // red
        }
    },
    CafienneService: {
        // URL of backend engine
        url: 'http://0.0.0.0:2027/',
        log: {
            // Whether or not to log HTTP call information (user, url, method type, headers)
            url: true, // URL includes call number, method type and user id
            request: {
                headers: true, // Shows request headers
                body: true, // Shows request body
            },
            response: {
                status: true, // Shows response statusCode and statusMessage, including call number 
                headers: true, // Shows response headers
                body: true, // Show all response bodies
                error: true // Show response body when status not OK             
            }
        },
        // CQRS Wait Time is the time the engine needs to process events from commands (e.g. StartCase, CompleteTask, CreateTenant) into the server side query database
        cqrsWaitTime: 5000
    },
    TokenService: {
        // URL of token service
        url: 'http://0.0.0.0:2377/token',
        // Issuer can be configured. The issuer must equal what is configure inside the Cafienne Engine
        issuer: 'http://localhost:8080',
        // Whether or not to show the tokens requested and updated in the user
        log: true
    },
    MockService: {
        // Whether or not to show log messages on the console from the mock service
        log: true,
        registration: true, // To show registration of mocks
        response: true // Better not use this
    },
    PlatformService: {
        // Whether or not to show log messages on the console from the platform APIs (e.g., whether tenant already exists or not)
        log: true
    },
    RepositoryService: {
        // Whether or not to show log messages on the console from the repository APIs (e.g., list of case definitions returned from server)
        log: true,
        repository_folder: './casemodels/bin'
    },
    TestCase: {
        // Whether or not to show log messages on the console (e.g. wait time messages for server side processing)
        log: true,
        polltimeout: 20_000
    }
}

export default Config;

