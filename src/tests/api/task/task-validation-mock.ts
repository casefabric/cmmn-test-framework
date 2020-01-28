import express from 'express';
import { Server } from 'http';
import Util from '../../../framework/test/util';
import TaskContent from './taskcontent';

/**
 * Simple mock service, leveraging Express to handle POST and GET requests, specifically for the TaskValidationTest.
 * It also has an in-memory "synchronization" mechanism through which it is possible to see if the mock is actually being invoked.
 * Also a very simplistic mechanism (e.g., a certain timeout period) to handle that invocation is not being done.
 * Also currently it allows to start/stop the Express service, but there is no state cleanup for it (and no testcase using it either).
 */
export default class TaskValidationMock {
    express = express();
    server!: Server;

    constructor(public port: number) {
    }

    private pinged: boolean = false;
    private callBackAfterPing!: Function;

    private checkPingDoneOrWait(done: Function, pinged: boolean, debugMsg: string) {
        this.callBackAfterPing = this.callBackAfterPing || done;
        this.pinged = this.pinged || pinged;

        if (this.pinged && this.callBackAfterPing) {
            done();
        }
    }

    async untilPingIsDone(millis: number) {
        const promise = new Promise(done => {
            this.checkPingDoneOrWait(done, this.pinged, 'Starting to wait')
        });
        // Small, too much of state holding internal timeout promise. But ok for now.
        const timeout = new Promise(async expired => {
            await Util.holdYourHorses(millis);
            if (!this.pinged) {
                // Not clear how to work with Promise.reject
                console.error(new Error(`Ping service has not been invoked within ${millis} milliseconds. Aborting test`));
                process.exit(-1);
//                throw new Error(`Ping service has not been invoked within ${millis} milliseconds. Aborting test`);
            }
        });
        return promise;
    }

    async start() {
        const promise = new Promise(resolve => {
            this.server = this.express.listen(this.port, () => {
                console.log("Started Mock Server on port " + this.port);
                resolve();
            });
        });
        this.express.post('/validate', (req, res, next) => {
            // TODO: There must be something more handy to parse the post contents, but could not find it quickly enough...
            let body = ''
            req.on('data', data => body += data);
            req.on('end', () => {
                const post = JSON.parse(body);

                const taskContent = post['task-output'];

                const isInvalidDecision = Util.sameJSON(taskContent, TaskContent.TaskOutputInvalidDecision);
                const isKillSwitch = Util.sameJSON(taskContent, TaskContent.TaskOutputThatFailsValidation);
                const isValidDecision = Util.sameJSON(taskContent, TaskContent.TaskOutputDecisionApproved) || Util.sameJSON(post, TaskContent.TaskOutputDecisionCanceled);
                if (isKillSwitch) {
                    res.writeHead(500);
                    res.write('Something went really wrong in here');
                    res.end();
                } else {
                    const response = isInvalidDecision ? TaskContent.InvalidDecisionResponse : {};
                    const json = JSON.stringify(response, undefined, 2);
                    res.writeHead(200, { 'Content-Type': 'text/json' });
                    res.write(json);
                    res.end();
                }
            });
        });
        this.express.get('/ping', (req, res, next) => {
            // Return immediately a code 200
            res.json();
            this.checkPingDoneOrWait(this.callBackAfterPing, true, "Received ping msg");
        });
        return promise;
    }

    async stop() {
        const promise = new Promise(done => {
            console.log("Stopping Mock server on port " + this.port);
            this.server.close(() => {
                console.log("Mock Server is stopped");
                done();
            });
        });
        return promise;
    }
}