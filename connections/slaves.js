/** Slaves module
 * @module connections/slaves
 */

/** Handle the connections from slaves (other synchronode instances serving files)
 * - assign tokens
 * - listen for connections from them on websockets
 */
module.exports = function slaveConnections(args) {
    /** @type {State} */
    const state = args.state;
    const app = args.app;
    const logger = args.logger;

    // initialize a map for the sockets from the slaves
    state.slaveSockets = new Map();
    state.pendingTokens = new Set();

    app.get("/register", (req, res) => {
        // TODO : register in state.slaveSockets

        /** generate UUID */
        const uuid = require("../util/uuid");

        const slaveConnectionId = uuid();
        state.pendingTokens.add(slaveConnectionId);
        res.type("json");
        res.end(JSON.stringify({ token: slaveConnectionId }));

        logger.log("request for token fulfilled with", slaveConnectionId);
    });

    app.ws("/ws/", function(ws, req) {
        //logger.log("ws endpoint initialized", ws, req)
        ws.on("message", function(message) {
            logger.log("websocket message", message);
            if (typeof message === "string") {
                // if it is a string, it is encapsulated in JSON
                try {
                    const messageFromSlave = JSON.parse(message);
                    const token = messageFromSlave.token;
                    const action = messageFromSlave.action;
                    const sendMessage = require("../util/socketSender.js")(ws);

                    if (action) { // slave answers a request (contains original action)
                        if (action === "browse") {
                            if (messageFromSlave.requestId) {
                                logger.log(
                                    "there is a requestId in the message sending to the responseObject",
                                    messageFromSlave);

                                state.pendingRequests
                                    .get(messageFromSlave.requestId)
                                    .end(JSON.stringify(messageFromSlave));

                            }
                        } else if (action === "stat") {
                            try {
                                state.pendingRequestSockets.get(messageFromSlave.requestId).send(messageFromSlave);
                            } catch (e) {
                                logger.error("Couldn't relay stat response from slave", e, messageFromSlave);
                            }
                        }
                    } else if ((!token) || !state.pendingTokens.has(token)) {
                        // TODO refactor this

                        sendMessage({
                            error: "No token in request or token unavailable for registration.",
                        });
                    } else { // there is a token to be registered
                        state.pendingTokens.delete(token);
                        state.slaveSockets.set(token, ws);
                        sendMessage({ status: "Connection open.", token: token });
                        logger.log("new socket opened", token);
                    }
                } catch (e) {
                    logger.error("Malformed WebSocket string request - ", e);
                }
            }
        });
    });
};
