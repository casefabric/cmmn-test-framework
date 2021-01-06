import Config from "../config";

export default class logger {
    static debug(msg: string = '') {
        if (this.debugEnabled) {
            coloredPrinter(Config.Log.color.debug, 'DEBUG', msg);
        }
        
    }
    
    static info(msg: string = '') {
        if (this.infoEnabled) {
            coloredPrinter(Config.Log.color.info, 'INFO', msg);
        }
    }
    
    static warn(msg: string = '') {
        if (this.warnEnabled) {
            coloredPrinter(Config.Log.color.warn, 'WARN', msg);
        }
    }
    
    static error(msg: string = '') {
        if (this.errorEnabled) {
            coloredPrinter(Config.Log.color.error, 'ERROR', msg);
        }
    }

    static get debugEnabled(): boolean {
        return Config.Log.level.toLowerCase() === 'debug'
    }

    static get infoEnabled(): boolean {
        return this.debugEnabled || Config.Log.level.toLowerCase() === 'info'
    }

    static get warnEnabled(): boolean {
        return this.infoEnabled || Config.Log.level.toLowerCase() === 'warn'
    }

    static get errorEnabled(): boolean {
        return this.warnEnabled || Config.Log.level.toLowerCase() === 'error'
    }
}

function coloredPrinter(color: string, prefix: string, msg: string) {
    while (msg.startsWith('\n')) {
        console.log();
        msg = msg.substring(1);
    }
    console.log(color, msg);
}