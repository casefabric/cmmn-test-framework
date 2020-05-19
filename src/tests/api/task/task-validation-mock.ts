import express from 'express';
import { Server } from 'http';
import { SomeTime } from '../../../framework/test/time';
import TaskContent from './taskcontent';
import Comparison from '../../../framework/test/comparison';

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
        // Small, too much of state holding internal timeout promise. But ok-ish for now.
        const timeout = new Promise(async expired => {
            await SomeTime(millis, 'Registering error callback for ping service; error will be raised in '+millis+' milliseconds.');
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

                const isInvalidDecision = Comparison.sameJSON(taskContent, TaskContent.TaskOutputInvalidDecision);
                const isKillSwitch = Comparison.sameJSON(taskContent, TaskContent.TaskOutputThatFailsValidation);
                const isValidDecision = Comparison.sameJSON(taskContent, TaskContent.TaskOutputDecisionApproved) || Comparison.sameJSON(post, TaskContent.TaskOutputDecisionCanceled);
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
        this.express.get('/usermappings/:type', (req, res, next) => {
            const solver: string = "receiving-user";
            const raiser: string = "sending-user";
            const specialism = req.params['type'];
            let specialist = '';
            switch(specialism) {
                case "Quarterly_Statement": specialist = solver; break;
                case "Facility_Request": specialist = raiser; break;
            }
            if (!specialist) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.write("There is no specialist for this type of ["+specialism+"]");
            } else {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.write(specialist);
            }
            res.end();
        });
        this.express.get('/notifycustomer/:status', (req, res, next) => {
            const incidentStatus = req.params['status'];
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.write("Notified Customer");
            res.end();
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