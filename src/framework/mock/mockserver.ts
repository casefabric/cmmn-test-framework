import express from 'express';
import { Server } from 'http';
import Config from '../../config';
import logger from '../logger';
import MockURL from './mockurl';

/**
 * Simple mock service, leveraging Express to handle POST and GET requests,
 * It has an in-memory "synchronization" mechanism through which it is possible to see if the mock is actually being invoked, including a timeout mechanism.
 * In order to use the mock service, for each end point you need to register a MockURL (e.g. a PostMock or a GetMock). This Mock must also be used for the synchronization.
 * Note that the same mock can be used for multiple calls to the end point, and it keeps track of the number of calls, including the number of waits for a call.
 * Also currently it allows to start/stop the Express service, but there is no state cleanup for it (and no testcase using it either).
 */
export default class MockServer {
    express = express();
    server!: Server;
    mocks: Array<MockURL> = [];

    constructor(public port: number) {
    }

    async start() {
        const promise = new Promise((resolve: Function) => {
            this.server = this.express.listen(this.port, () => {
                if (Config.MockService.registration) {
                    logger.info("Started Mock Server on port " + this.port);
                }
                resolve();
            });
        });
        this.mocks.forEach(mock => mock.register());
        return promise;
    }

    async stop() {
        const promise = new Promise((done: Function) => {
            if (Config.MockService.registration) {
                logger.info("Stopping Mock server on port " + this.port);
            }
            this.server.close(() => {
                if (Config.MockService.registration) {
                    logger.info("Mock Server is stopped");
                }
                done();
            });
        });
        return promise;
    }
}
