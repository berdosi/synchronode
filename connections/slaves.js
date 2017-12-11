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
    });

    app.ws("/", function (ws, req) {
        ws.on("message", function (message) {
            if (typeof message === "string") {
                // if it is a string, it is encapsulated in JSON
                try {
                    const messageFromSlave = JSON.parse(message);
                    const token = messageFromSlave.token;
                    const action = messageFromSlave.action;

                    const socketSenderFactory = require("../utils/socketSender.js");
                    const sendMessage = socketSenderFactory(ws);

                    if (action) return; // this code only handles registration into the state

                    if ((!token) || !state.pendingTokens.has(token)) {
                        sendMessage({
                            error: "No token in request or token unavailable for registration."
                        });
                    } else {
                        state.pendingTokens.delete(token);
                        state.slaveSockets.set(token, ws);
                        sendMessage({ status: "Connection open." });
                        logger.log("new socket opened", token, ws);
                    }
                } catch (e) {
                    logger.error("Malformed WebSocket string request - ", e)
                }
            }
            logger.log(message);
        });
    });
}