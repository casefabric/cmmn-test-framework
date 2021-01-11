const Config = {
    Log: {
      level: 'INFO',
      color: {
          debug: '\x1b[0m%s\x1b[0m', // debug logging is white
          info: '\x1b[32m%s\x1b[0m', // green
          warn: '\x1b[33m%s\x1b[0m', // orange
          error: '\x1b[31m%s\x1b[0m' // red
      }  
    },
    CafienneService: {
        // URL of backend engine
        url: 'http://localhost:2027/',
        // CQRS Wait Time is the time the engine needs to process events from commands (e.g. StartCase, CompleteTask, CreateTenant) into the server side query database
        cqrsWaitTime: 5000
    },
    TokenService: {
        // URL of token service
        url: 'http://localhost:2377/token',
        // Issuer can be configured. The issuer must equal what is configure inside the Cafienne Engine
        issuer: 'Cafienne Test Framework',
    },
    RepositoryService: {
        repository_folder: './casemodels/bin'
    },
}

export default Config;

