/** generate UUID
 * @return {string}
*/
const uuid = require("../util/uuid");

/**
 * Handle the connections from slaves (other synchronode instances serving files) 
 * - assign tokens
 * - listen for connections from them on websockets
*/
function slaveConnections(args) {
    /** @type {State} */
    const state = args.state;
    const app = args.app;
    const logger = args.logger;

    // initialize a map for the sockets from the slaves
    state.slaveSockets = new Map();
    state.pendingTokens = new Set();

    app.get("/register", (req, res) => {
        // TODO : register in state.slaveSockets 

        const slaveConnectionId = uuid();
        state.pendingTokens.add(slaveConnectionId);
        res.type("json");
        res.end(JSON.stringify({ token: slaveConnectionId }));
    });

    // TODO : listen for icoming connections from slaves
    app.ws("/", function (ws, req) {
        ws.on("message", function (message) {
            if (typeof message === "string") {
                // if it is a string, it is encapsulated in JSON
                try {
                    const messageFromSlave = JSON.parse(message);
                    const token = messageFromSlave.token;
                    if ((!token) || !state.pendingTokens.has(token)) {
                        // there is no valid token in the request
                    } else {
                        state.pendingTokens.delete(token);
                        state.slaveSockets.set(token, ws);
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

module.exports = slaveConnections;