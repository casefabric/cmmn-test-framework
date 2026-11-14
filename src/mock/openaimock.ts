import logger from '../logger';
import MockServer from './mockserver';
import { MockInvocation } from './mockurl';
import PostMock from './postmock';

/**
 * A fake of the OpenAI Chat Completions API, for the AI image of the case engine (cafienne/engine:latest-ai).
 * The engine reaches it through OPENAI_BASE_URL (.circleci/docker-config/engine-ai-with-inmemory-db.yml in case-engine).
 *
 * A test registers answers for fragments of the prompt; a request is answered by the first fragment that the
 * text of its messages contains. A request without a matching answer gets an empty JSON object, so that it fails on
 * the output type of the action, and not on the model: an error status would make the engine halt the model.
 */
export default class OpenAiMock extends MockServer {
    static readonly PORT = 18090;
    private static instance?: OpenAiMock;

    /**
     * The one mock on the port of OPENAI_BASE_URL; it starts on first use and runs until the test run ends
     */
    static get(): OpenAiMock {
        if (!this.instance) {
            this.instance = new OpenAiMock(OpenAiMock.PORT);
            this.instance.start();
        }
        return this.instance;
    }

    readonly prompts: Array<string> = [];
    private answers: Array<{ fragment: string, answer: any }> = [];

    private constructor(port: number) {
        super(port);
        new PostMock(this, '/v1/chat/completions', call => call.onJSONContent((body: any) => {
            const prompt = (body.messages || []).map((message: any) => typeof message.content === 'string' ? message.content : JSON.stringify(message.content)).join('\n');
            this.prompts.push(prompt);
            const match = this.answers.find(answer => prompt.indexOf(answer.fragment) >= 0);
            if (!match) {
                logger.info(`OpenAI mock has no answer for the prompt:\n${prompt}`);
            }
            Promise.resolve(match ? (typeof match.answer === 'function' ? match.answer(prompt) : match.answer) : {}).then(answer => this.respond(call, body, prompt, answer));
        }));
    }

    private respond(call: MockInvocation, body: any, prompt: string, answer: any) {
        const content = typeof answer === 'string' ? answer : JSON.stringify(answer);
        if (call.res.writableEnded || call.res.destroyed) {
            // The engine stopped waiting (the call was killed)
            return;
        }
        call.json({
            id: `chatcmpl-mock-${this.prompts.length}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: body.model,
            choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
            usage: { prompt_tokens: Math.ceil(prompt.length / 4), completion_tokens: Math.ceil(content.length / 4), total_tokens: Math.ceil((prompt.length + content.length) / 4) }
        });
    }

    /**
     * Answers requests whose prompt contains the fragment; an object is answered as JSON
     */
    answer(fragment: string, answer: any) {
        this.answers = this.answers.filter(existing => existing.fragment !== fragment);
        this.answers.push({ fragment, answer });
        return this;
    }

    /**
     * Holds back the answer to requests whose prompt contains the fragment, so that the AI call keeps running.
     * arrived resolves when such a request comes; release answers it (and later ones) with the answer.
     */
    hold(fragment: string): { arrived: Promise<void>, release: (answer: any) => void } {
        let arrive: () => void = () => {};
        let release: (answer: any) => void = () => {};
        const arrived = new Promise<void>(resolve => arrive = resolve);
        const released = new Promise<any>(resolve => release = resolve);
        this.answer(fragment, () => {
            arrive();
            return released;
        });
        return { arrived, release };
    }

    /**
     * Forgets the answers and the prompts
     */
    reset() {
        this.answers = [];
        this.prompts.splice(0);
        return this;
    }

    promptsWith(fragment: string): Array<string> {
        return this.prompts.filter(prompt => prompt.indexOf(fragment) >= 0);
    }
}
