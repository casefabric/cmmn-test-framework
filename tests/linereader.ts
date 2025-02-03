import readline from 'readline-sync';

/**
 * Simplistic utility to read a line from console.
 * 
 */
export default class LineReader {
    enabled: boolean = false;

    question(msg: string, enabled: boolean = this.enabled): string {
        return enabled ? readline.question(msg) : '';
    }
}