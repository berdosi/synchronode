"use strict";
const Logger = require("./util/logging.js");
const config = require("./config.js");
const store = {};

// to implement : attempt to reload store from persitent memory

const express = require("express");
let expressWs = require("express-ws");
expressWs = expressWs(express());
const app = expressWs.app;

app.use(function (req, res, next) {
  Logger.log("middleware");
  req.testing = "testing";
  return next();
});

app.use(express.static("static")); // serve files from ./static 

app.get("/", function (req, res, next) {
  Logger.log("get route", req.testing);
  res.end("oh hi");
});

app.ws("/", function (ws, req) {
  ws.on("message", function (msg) {
    Logger.log(msg);
  });
  Logger.log("socket", req.testing);
});

// if there is a master, connect to it
if (config.master) require("./connections/master.js")({ config, store, Logger });

require("./connections/slaves.js")({ config, store, Logger });
require("./connections/clients.js")({ config, store, Logger });

// listen for requests (as master as well as a local webserver serving the swarm's files)
app.listen(config.port);
