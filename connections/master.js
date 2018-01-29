/** Master module
 * @module connections/master
 */

/** Handle the connections with the server 
 * - logging in upon start
 *     - get hostId
 *     - open websocket with that hostId
 * - listen for requests and answer them */
module.exports = function connectMaster(args) {
    "use strict";
    const https = require("https");
    const fs = require("fs");
    const WebSocket = require("ws");

    const master = args.config.master; // URL of the master to connect to, without protocol
    const logger = args.logger;
    const state = args.state;

    const req = https.request("https://" + master + "/register", (response) => {
        logger.info("status", response.statusCode);
        let data = "";
        response.on("data", (incoming) => { data += incoming; })
        response.on("end", () => {
            // store the token received from the master
            const responseObject = JSON.parse(data);
            state.token = responseObject.token;

            // acknowledge the token by opening a WebSocket to the master
            const ws = new WebSocket("wss://" + master + "/ws/");
            state.masterSocket = ws;

            ws.on("open", function open() {
                logger.log("socket open, sending back token via WebSocket");
                ws.send(JSON.stringify({ token: responseObject.token }));
            });

            ws.on("message", function incoming(message) {
                const parseMessage = JSON.parse(message);
                logger.log("message from master", parseMessage);
                // if the message has a request ID, fulfill it.
                // currently we are only adding some hailing from the slave.
                if (parseMessage.requestId) {

                    // TODO authentication here .
                    // currently we're just listing directorycontents to whomever knows the token.
                    const path = parseMessage.requestPath;
                    if (path)
                        fs.readdir(requestPath, (err, response) => {
                            let responseToMaster;
                            if (err) responseToMaster = Object.assign({}, parseMessage, { slaveHail: "hello from slave", error: err });
                            else responseToMaster = Object.assign({}, parseMessage, { slaveHail: "hello from slave", listing: response });


                            ws.send(JSON.stringify(responseToMaster));
                        })
                    else ws.send(JSON.stringify(Object.assign({}, parseMessage, { slaveHail: "no path found in request" })));

                }
            })

        })
    });

    req.on('error', (e) => {
        logger.error(
            `Master unavailable: instance will be working as a standalone master node. Problem with request: ${e.message}`);
    });

    req.end();
}