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

    /** generate UUID */
    const uuid = require("../util/uuid");

    /** @type {State} */
    const state = args.state;

    /** Keep track on to-be-fulfilled requests. 
     * When a message arrrives from one of the slaves, its requestId is looked for in this Map.
     * The referenced request is fulfilled with the client's message.
     * @type {Map<String,ExpressRequest>} */
    state.pendingRequests = new Map();

    app.get("/browse/:hostId/:path", (req, res, next) => {
        logger.log(req, res, next);
        const hostId = req.params["hostId"];

        if (state.slaveSockets.has(hostId)) {
            // there is a slave with this ID

            /** identify the request when the slave's websocket answers
             * @type {string}
             */
            const requestId = uuid();
            state.slaveSockets.get(hostId).send(JSON.stringify({
                action: "browse",
                requestId: requestId,
                path: req.params["path"]
            }));
            state.pendingRequests.set(requestId, res);
        }
        else res.send("not found");
    })
}