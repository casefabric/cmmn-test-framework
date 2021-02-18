
# Cafienne Test Framework
A Typescript based test framework for CMMN case models

The test framework is intended to provide an easy means of building test cases against the Cafienne engine.

The Cafienne engine has the following aspects
- Authentication can only be done through OpenID Connect protocol
- The multi-tenant environment requires user registration before you can start running cases.

# Setup environment
The test framework uses a simple Token Generator to generate JWT tokens that the Cafienne Engine can trust. This "IDP" generates any JWT token that we ask it to generate, and in using that the test framework circumvents the Open ID Connect protocol that a normal Cafienne deployment uses.
In order to make Cafienne Engine "trust" these tokens, the config settings of the engine have to be changed.

## Running the Token Generator
Some of the default engine test cases also need a mailcatcher docker image.
Inside the [developer-information repository](https://github.com/cafienne/developer-information) you can find a simple setup that includes both images.

If you want to run only with the basic Token Generator, follow the instructions below. 

Inside the `./docker` directory of this test framework is a file called `docker-compose.yml`.
To run the Token Generator, make sure docker is started, and then run `docker-compose up` in the `./docker` directory.
```bash
    cd ./docker
    docker-compose up
```
This will start a token generator on port http://localhost:2377.

## Configure Cafienne Engine to trust this IDP
```yml
    Security Alert - do not run this in production

    The IDP generates any requested token without validation.
    Using it in a production environment of the Cafienne Engine
    will run the system without proper authentication
```
The Cafienne Engine OpenID Connect configuration settings must be modified to point to the test IDP.
Open Cafienne's `local.conf` file.
In there, search for `oidc` and change it in the below
```conf
    cafienne {
        # Platform has owners that are allowed to create/disable/enable tenants
        #  This property specifies the set of user-id's that are owners
        #  This array may not be empty.
        platform {
            owners = ["admin"]
        }

        api {
            security {
                # configuration settings for OpenID Connect
                oidc {
                    connect-url = "http://localhost:2377/.well-known/openid-configuration"
                    token-url = "http://localhost:2377/token"
                    key-url = "http://localhost:2377/keys"
                    authorization-url = "http://localhost:2377/auth"
                    issuer = "Cafienne Test Framework"
                }
        }
    }
```

## Off we go ...
Now you can run the test script, simply by entering
```bash
npm install
npm run dev
```
or
```bash
npm install
npm run production
```
The current test framework runs a simple test on the HelloWorld case model.
It assumes that the engine has `admin` as platform owner, as shown in the `local.conf` above.

## Custom configuration
The test framework exposes a few configuration options. These are stored inside the file `./build/config.js`.

By default all logging is enabled.
```js
var Config = {
    CafienneService: {
        // URL of backend engine
        url: 'http://localhost:2027/',
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
                body: true // Shows response body
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
        log: true
    },
    PlatformService: {
        // Whether or not to show log messages on the console from the platform APIs (e.g., whether tenant already exists or not)
        log: true
    },
    RepositoryService: {
        // Whether or not to show log messages on the console from the repository APIs (e.g., list of case definitions returned from server)
        log: true
    },
    TestCase: {
        // Whether or not to show log messages on the console (e.g. wait time messages for server side processing)
        log: true
    }
};
```
It holds the end points of the token service and the case engine.

Here you can also modify the `issuer` field of the token. In case this is changed, make sure that the change is also reflected in the `local.conf` of the case engine.