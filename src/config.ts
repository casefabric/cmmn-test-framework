const Config = {
    CafienneService: {
        url: 'http://localhost:2027/',
        log: {
            traffic: false,
            content: true
        }
    },
    TokenService: {
        url: 'http://localhost:2377/token',
        issuer: 'Cafienne Test Framework'
    }
}

export default Config;

