import express from 'express';
import { Server } from 'http';
import Config from '../config';
import logger from '../logger';
import MockURL from './mockurl';
import enableDestroy from 'server-destroy';

/**
 * Simple mock service, leveraging Express to handle POST and GET requests,
 * It has an in-memory "synchronization" mechanism through which it is possible to see if the mock is actually being invoked, including a timeout mechanism.
 * In order to use the mock service, for each end point you need to register a MockURL (e.g. a PostMock or a GetMock). This Mock must also be used for the synchronization.
 * Note that the same mock can be used for multiple calls to the end point, and it keeps track of the number of calls, including the number of waits for a call.
 * Also currently it allows to start/stop the Express service, but there is no state cleanup for it (and no testcase using it either).
 */
export default class MockServer {
    mocks: Array<MockURL> = [];
    private expressWrapper: ExpressWrapper;
    constructor(public port: number) {
        this.expressWrapper = getExpressWrapper(port);
    }

    /**
     * Returns express() on which URL listeners can be registered.
     */
    get express() {
        return this.expressWrapper.express;
    }

    /**
     * Open the port (if not yet done), and register our mocks
     */
    start() {
        this.expressWrapper.start();
        this.mocks.forEach(mock => mock.register());
    }

    /**
     * Stop the mock server
     */
    stop() {
        this.expressWrapper.stop();
    }
}

function getExpressWrapper(port: number): ExpressWrapper {
    const wrapper = expressWrappers.find(wrapper => wrapper.port === port) || new ExpressWrapper(port);
    if (expressWrappers.indexOf(wrapper) < 0) {
        expressWrappers.push(wrapper);
    }
    return wrapper;
}

function removeExpressWrapper(wrapper: ExpressWrapper) {
    if (expressWrappers.indexOf(wrapper) >= 0) {
        expressWrappers.splice(expressWrappers.indexOf(wrapper), 1);
    }
}

const expressWrappers: Array<ExpressWrapper> = [];

class ExpressWrapper {
    public express = express();
    public server!: Server;
    private isStarted: boolean = false;

    constructor(public port: number) {}

    start() {
        if (this.isStarted) {
            // No need to start again that's already done.
            return;
        }
        this.server = this.express.listen(this.port, () => {
            if (Config.MockService.registration) {
                logger.info("Started Mock Server on port " + this.port);
            }
        });
        this.isStarted = true;
        enableDestroy(this.server);
    }

    stop() {
        if (Config.MockService.registration) {
            logger.info("Stopping Mock server on port " + this.port);
        }
        const port = this.port;
        this.server.destroy(function(err) {
            if (err) {
                logger.info(`Failure while shutting down mock server on port ${port}: ${err.message}`);
            } else {
                logger.info(`Mock server on port ${port} is stopped`);
            }
        });
        removeExpressWrapper(this);
    }
}
