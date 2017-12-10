/** Handle the connections from clients (via browser) 
 * - clients communicate a token along with their requests
 * - if the token exists, Master gets the data from the websocket.
*/
function clientConnections(args) {
    const logger = args.logger;
    logger.log("to implement: listening for clients");
    const app = args.app;

    /** @type {State} */
    const state = args.state;

    // handle GET and POST endpoints
    /* /browse/hostId
    
    */
    app.get("/browse/:hostId", (req, res, next) => {
        logger.log(req, res, next);
        const hostId = req.params["hostId"];

        if (hostId !== "swarm")
            if (state.slaveSockets.has(hostId)) {
                res.send("found it");
            }
            else res.send("not found");
    })

}

module.exports = clientConnections;