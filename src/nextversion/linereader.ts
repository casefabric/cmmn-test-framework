import readline from 'readline-sync';


export default class LineReader {
    static enabled: boolean = true;

    static read(question: string = 'Press enter to continue'): string {
        if (LineReader.enabled) {
            return readline.question(question);
        } else {
            return '';
        }
    }

    enabled: boolean = true;

    question(msg: string, enabled: boolean = this.enabled): string {
        return enabled ? readline.question(msg) : '';
    }
}