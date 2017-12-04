"use strict";
const Logger = require("./util/logging.js");

const express = require("express");
let expressWs = require("express-ws");
expressWs = expressWs(express());
const app = expressWs.app;

app.use(function (req, res, next) {
  Logger.log("middleware");
  req.testing = "testing";
  return next();
});

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

app.listen(3000);
