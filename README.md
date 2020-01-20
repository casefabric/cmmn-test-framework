# cmmn-test-framework
A Typescript based test framework for CMMN case models

The test framework is intended to provide an easy means of building test cases against the Cafienne engine.

The Cafienne engine has the following aspects
- Authentication can only be done through OpenID Connect protocol
- The multi-tenant environment requires user registration before you can start running cases.

# Setup environment
The test framework uses a simple test IDP to generate tokens.
In order to make Cafienne Engine "trust" these tokens, the config settings of the engine have to be changed.

## Running the test idp
Inside the `./docker` directory of this test framework is a file called `run-idp.yml`.
To run the engine, simply invoke the following command
```bash
    docker-compose -f ./docker/run-idp.yml up
```
This will start a token generator on port http://localhost:2377

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
npm run dev
```
or
```bash
npm run production
```
The current test framework runs a simple test on the HelloWorld case model.
It assumes that the engine has `admin` as platform owner, as shown in the `local.conf` above.

## Custom configuration
The test framework exposes a few configuration options. These are stored inside the file `./build/config.js`.
```js
var Config = {
    CafienneService: {
        // End-point of case engine
        url: 'http://localhost:2027/',
        // Log settings for HTTP traffic
        log: {
            traffic: false, // Log HTTP traffic metadata (method, user, url)
            content: true // Log HTTP content. Only use when 'traffic = true'
        }
    },
    TokenService: {
        // End-point of token service
        url: 'http://localhost:2377/token',
        // Issuer as put inside the JWT token. Must match with local.conf settings of engine.
        issuer: 'Cafienne Test Framework',
    }
};
```
It holds the end points of the token service and the case engine.

Here you can also modify the `issuer` field of the token. In case this is changed, make sure that the change is also reflected in the `local.conf` of the case engine.