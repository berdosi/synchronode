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
    const master = args.config.master; // URL of the master to connect to, without protocol
    const port = args.config.port;
    const logger = args.logger;
    const state = args.state;

    // get own token and put it into the state
    // 
    /** @type {RequestOptions} */
    const options = {
        host: master.replace(/\/.*/, ""),
        port: port,
        path: master.replace(/[^/]*\//, "/register"),
        method: "GET",
        headers: {}
    };

    const req = https.request(options, (response) => {
        logger.info("status", response.statusCode);
        const data = "";
        response.on("data", (incoming) => { data += incoming; })
        response.on("end", () => {
            // state the token received from the master
            const responseObject = JSON.parse(data);
            logger.info("response:", responseObject);
            state.token = responseObject.token;
        })
    });

    req.on('error', (e) => {
        logger.error(
            `Master unavailable: instance will be working as a standalone master node. Problem with request: ${e.message}`);
    });
}