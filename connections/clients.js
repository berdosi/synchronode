/** Clients module
 * @module connections/clients
 */

/** Handle the connections from clients (e.g. requests via browser) 
 * - clients communicate a token along with their requests
 * - if the token exists, Master gets the data from the websocket.
 * 
 */
module.exports = function clientConnections(args) {
    const logger = args.logger;
    logger.log("to implement: listening for clients");
    const app = args.app;
    const express = args.express;

    app.use(express.static("static")); // serve files from ./static 

    /** generate UUID */
    const uuid = require("../util/uuid");

    /** @type {State} */
    const state = args.state;

    /** Keep track on to-be-fulfilled requests. 
     * When a message arrrives from one of the slaves, its requestId is looked for in this Map.
     * The referenced request is fulfilled with the client's message.
     * @type {Map<String,ExpressRequest>} */
    state.pendingRequests = new Map();

    app.get("/browse/*", (req, res, next) => {
        logger.log("new request", req.params);
        const hostId = req.params[0].replace(/\/.*/, "");
        const requestPath = req.params[0].replace(/[^\/]+\//, "");

        if (state.slaveSockets.has(hostId)) {
            // there is a slave with this ID

            /** identify the request when the slave's websocket answers
             * @type {string}
             */
            logger.log("has hostId");
            const requestId = uuid();
            state.slaveSockets.get(hostId).send(JSON.stringify({
                action: "browse",
                requestId: requestId,
                path: requestPath
            }));
            state.pendingRequests.set(requestId, res);
        }
        else res.send("{error: 'not found'}");
    })
}