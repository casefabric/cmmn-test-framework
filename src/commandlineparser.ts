import Config, { MinimalLoggingConfig, NoLoggingConfig } from './config';
import WorldWideTestTenant from './tests/setup/worldwidetesttenant';

const TIMEOUT_PARAMETER = '-t';
const LOGGING_PARAMETER = '-l';
const TENANT_PARAMETER = 'in';
const PARALLELLISM_PARAMETER = '-p';
const RETRYPERIOD_PARAMETER = '-r';
const URLS_PARAMETER = '-urls';

export default class CommandLineParser {
    isNPM = process.argv.length > 0 && process.argv[0].toLowerCase() === 'npm';
    configArguments: Array<string> = process.argv.slice(this.isNPM ? 3 : 2);


    constructor() {
        this.parseTimeout();
        this.parseLogging();
        this.parseParallellism();
        this.parseTenant();
        this.parsePollingPeriod();
        this.parseEngines();
    }

    private parseTimeout() {
        if (this.configArguments.length) {
            const timeout = this.configArguments[0];
            if (!isNaN(Number(timeout)) && timeout.trim() !== TIMEOUT_PARAMETER) { // Classic style setting timeout
                console.log('Setting CQRS wait time to ' + timeout)
                Config.CaseEngine.cqrsWaitTime = Number(timeout);

                // Remove the timeout parameter
                this.configArguments = this.configArguments.slice(1);
            } else {
                Config.CaseEngine.cqrsWaitTime = this.readNumber(TIMEOUT_PARAMETER, 'CQRS wait time', Config.CaseEngine.cqrsWaitTime, 100);
            }
        }
    }

    private parsePollingPeriod() {
        Config.TestCase.polltimeout = this.readNumber(RETRYPERIOD_PARAMETER, 'Retry period upon failing assertions', Config.TestCase.polltimeout, 1000);
    }

    private parseLogging() {
        const logLevel = this.readValue(LOGGING_PARAMETER, 'logging', 'max', 'min', 'none');
        const fillLoggingConfiguration = (logConfig: any) => Object.assign(Config, logConfig);
        switch (logLevel) {
            case 'max': break; // No changes
            case 'min':
                fillLoggingConfiguration(MinimalLoggingConfig);
                break;
            case 'none':
                fillLoggingConfiguration(NoLoggingConfig);
                break;
        }
    }

    private parseEngines() {
        const urls = this.readValue(URLS_PARAMETER, 'URLs for various engine nodes as a comma separate list', '').split(',').filter(url => url.trim().length > 0);
        const urlEnhancer = (url: string) => {
            // Let's first check if it is only a port number or a full URL
            const asPortNumber = new Number(url);
            if (asPortNumber >= 0) {
                url = `http://0.0.0.0:${asPortNumber}/`;
            }
            // Make sure it ends with a slash
            url = url.endsWith('/') ? url : url + '/';
            return url;
        }
        if (urls.length) {
            const configuredBackendURLs = urls.map(urlEnhancer);
            console.log(`Found command line engine URLs:\n${urls.map(url => ` - ${url} ${urlEnhancer(url) != url ? '==> ' + urlEnhancer(url) : ''}`).join('\n')}`);
            (Config.CaseEngine as any).urls = configuredBackendURLs;
            const singleBackendEndpoint = configuredBackendURLs.find(url => url.indexOf(Config.CaseEngine.url) >= 0);
            if (!singleBackendEndpoint) {
                console.log(`\nOverriding config setting\n Config.CaseEngine.url: ${Config.CaseEngine.url} ==> ${configuredBackendURLs[0]}`);
                Config.CaseEngine.url = configuredBackendURLs[0];
            }
        }
    }

    private parseTenant() {
        WorldWideTestTenant.defaultTenantName = this.readValue(TENANT_PARAMETER, 'tenant', 'World-Wide-Test-Tenant', 'world');
    }

    private parseParallellism() {
        Config.TestCase.parallellism = this.readNumber(PARALLELLISM_PARAMETER, 'parallellism', Config.TestCase.parallellism, 1);
    }

    private readNumber(setting: string, description: string, defaultValue: number, mininumValue: number): number {
        const hasSetting: number = this.configArguments.indexOf(setting);
        if (hasSetting >= 0) {
            if (this.configArguments.length < hasSetting + 2) {
                throw new Error(`Configuration misses value for ${description} (found ${setting} without a number)`);
            }
            const value = this.configArguments[hasSetting + 1];
            const number = Number(value);
            if (isNaN(number)) {
                throw new Error(`Configuration value for ${description} must be a number (found ${value})`);
            }
            if (number < mininumValue) {
                throw new Error(`Configuration value for ${description} must be at least ${mininumValue} (found ${number})`);
            }
            this.configArguments[hasSetting] = '';
            this.configArguments[hasSetting + 1] = '';
            this.configArguments = this.configArguments.filter(arg => arg.length > 0);
            console.log(`Setting config for ${description} to ${number}`)
            return number;
        } else {
            return defaultValue;
        }
    }

    private readValue(setting: string, description: string, defaultValue: string, ...otherPossibleValues: Array<string>): string {
        const hasSetting: number = this.configArguments.indexOf(setting);
        if (hasSetting >= 0) {
            if (this.configArguments.length < hasSetting + 2) {
                throw new Error(`Configuration misses value for ${description} (found ${setting} without a value)`);
            }
            const value = this.configArguments[hasSetting + 1];
            const possibleValues = [defaultValue, ...otherPossibleValues];
            if (otherPossibleValues.length && !possibleValues.includes(value)) {
                throw new Error(`Configuration has invalid value for ${description} (found "${value}", but must be one of [${possibleValues.map(v => '"' + v + '"').join(', ')}])`);
            }
            this.configArguments[hasSetting] = '';
            this.configArguments[hasSetting + 1] = '';
            this.configArguments = this.configArguments.filter(arg => arg.length > 0);
            return value;
        } else {
            return defaultValue;
        }
    }

    get testNames(): Array<string> {
        return this.configArguments;
    }
}
