/*
 * Copyright (C) 2019-2024 LEIDOS.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var indexRouter = require("./routes/index");
const jwt = require("jsonwebtoken");
const data = require("./config/data");

var app = express();
const cors = require("cors");

require("dotenv").config();
var corsOptions = {
  origin: process.env.ALLOW_CLIENT_URL,
  credentials: true,
  optionsSuccessStatus: 200,
};
console.log("Allowed client URL: " + process.env.ALLOW_CLIENT_URL);

//Allow cors from selected clients
app.use(cors(corsOptions));

const verifyToken = (req) => {
  //Authorization: 'TOKEN'
  const token = req.headers.authorization;
  if (token) {
    const decodedToken = jwt.verify(token, process.env.SECRET);  
    if (decodedToken && decodedToken.exp > (new Date().getTime() / 1000)) {
      return true;
    }
  }
  return false;
};

// Access session when receiving GET request
app.get("/*", function (req, res, next) {
  if (req.url === "/api/org/all") {
    //Pass request for the above URLs
    next();
  } else if (verifyToken(req)) {
    next();
  } else {
    res
      .status("401")
      .send({ message: "User session is expired", reason: "expire" });
    res.end();
    }
  });

// Access session when receiving POST request
app.post("/*", function (req, res, next) {
  if (
    req.url === "/api/users/forget/password" ||
    req.url === "/api/users/login" ||
    req.url === "/api/users/register"
  ) {
    //Pass request for the above URLs
    next();
  } else if (verifyToken(req)) {
    next();
  } else {
    res
      .status("401")
      .send({ message: "User session is expired", reason: "expire" });
    res.end();
    }
  });

//Access session when receiving DELETE request
app.delete("/*", function (req, res, next) {
  if (verifyToken(req)) {
    next();
  } else {
    res
      .status("401")
      .send({ message: "User session is expired", reason: "expire" });
    res.end();
  }
});

//parse request of content type application/json
app.use(express.json());

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
require("./routes/users")(app);
require("./routes/events.router")(app);
require("./routes/org.router")(app);
require("./routes/locations.router")(app);
require("./routes/units.router")(app);
require("./routes/default_event_topics.router")(app);
require("./routes/user_topic_request.router")(app);
require("./routes/event_units.router")(app);
require("./routes/testing_typess.router")(app);
require("./routes/states.router")(app);
require("./routes/dashboards.router")(app);
require("./routes/rsu_management/rsu_registration.router")(app);
require("./routes/rsu_management/data_selection.router")(app);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

const grafana_db = require("./models");
grafana_db.seq
  .sync()
  .then(() => {
    console.log("Synced grafana_db.");
    //Initialize data
    grafana_db.testing_types.bulkCreate(data.initial_testing_types_array, {
      fields: ["name"],
      updateOnDuplicate: ["name"],
    });

    grafana_db.states.bulkCreate(data.initial_states_array, {
      fields: ["code", "name"],
      updateOnDuplicate: ["code", "name"],
    });
  })
  .catch((err) => {
    console.log("Failed to sync grafana_db: " + err.message);
  });

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
