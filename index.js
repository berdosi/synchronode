"use strict";
const logger = require("./util/logging");
const config = require("./config.js");

const state = {};

// to implement : attempt to reload state from persitent memory

const express = require("express");
let expressWs = require("express-ws");
expressWs = expressWs(express());
const app = expressWs.app;

const masterConnection = require("./connections/master.js");
const slaveConnection = require("./connections/slaves.js");
const clientConnection = require("./connections/clients.js");

// connect to the master, if it is configured
if (config.master) masterConnection({ config, state, logger });

slaveConnection({ app, config, state, logger });
clientConnection({ app, config, state, logger, express });

// listen for requests (as master as well as a local webserver serving the swarm's files)
app.listen(config.port, "localhost");