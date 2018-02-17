/** Master module
 * @module connections/master
 */

/** Handle the connections with the server
 * - logging in upon start
 *     - get hostId
 *     - open websocket with that hostId
 * - listen for requests and answer them
 */
module.exports = function connectMaster(args) {
    "use strict";
    const https = require("https");
    const fs = require("fs");
    const WebSocket = require("ws");

    const master = args.config.master; // URL of the master to connect to, without protocol
    const logger = args.logger;
    const state = args.state;
    const magic = require("magic-number");

    const req = https.request("https://" + master + "/register", (httpResponse) => {
        logger.info("status", httpResponse.statusCode);
        let data = "";
        httpResponse.on("data", (incoming) => { data += incoming; });
        httpResponse.on("end", () => {
            // store the token received from the master
            const responseObject = JSON.parse(data);
            state.token = responseObject.token;

            // acknowledge the token by opening a WebSocket to the master
            const ws = new WebSocket("wss://" + master + "/ws/");
            state.masterSocket = ws;

            ws.on("open", function open() {
                logger.log("socket open, sending back token via WebSocket");
                ws.send(JSON.stringify({ token: responseObject.token }));

                // lame keep alive
                setInterval(() => ws.send(`{ "action": "keep-alive", "token": '${responseObject.token}' }`), 60000);
            });

            ws.on("message", function incoming(message) {
                const parseMessage = JSON.parse(message);
                logger.log("message from master", parseMessage);
                // if the message has a request ID, fulfill it.
                // currently we are only adding some hailing from the slave.
                if (parseMessage.requestId) {

                    if (parseMessage.path !== undefined) {
                        // TODO authentication here .
                        // currently we're just listing directorycontents to whomever knows the token.
                        // find directories from the config.shareRoot
                        const path =
                            (args.config.shareRoot + "/" + parseMessage.path.replace("..", "")).replace(/\/$/, "");
                        fs.stat(path, (err, file) => {
                            if (err) {
                                ws.send(
                                    JSON.stringify(
                                        Object.assign({}, parseMessage, { slaveHail: "error when acccessing path" })));
                            } else {
                                let responseToMaster;
                                if (file.isDirectory()) {
                                    fs.readdir(path, (err2, readdirResponse) => {
                                        if (err2) {
                                            responseToMaster = Object.assign({}, parseMessage, { error: err2 });
                                        } else {
                                            responseToMaster =
                                                Object.assign(
                                                    {},
                                                    parseMessage,
                                                    {
                                                        listing: readdirResponse,
                                                    });
                                        }

                                        ws.send(JSON.stringify(responseToMaster));
                                    });
                                } else {
                                    fs.readFile(path, (err2, readFileResponse) => {
                                        if (err2) {
                                            responseToMaster = Object.assign({}, parseMessage, { error: err2 });
                                        } else {
                                            responseToMaster = Object.assign(
                                                {},
                                                parseMessage,
                                                {
                                                    fileContents: readFileResponse.toString("base64"),
                                                    mimeType: magic.detectFile(path),
                                                });
                                        }
                                        ws.send(JSON.stringify(responseToMaster));

                                    });
                                }
                                // todo error handling if neither
                            }
                        });
                    } else {
                        ws.send(
                            JSON.stringify(
                                Object.assign({}, parseMessage, { slaveHail: "no path found in request" })));
                    }

                }
            });

        });
    });

    req.on("error", (e) => {
        logger.error(
            `Master unavailable: instance will be working as a standalone master node. Problem: ${e.message}`);
    });

    req.end();
};
