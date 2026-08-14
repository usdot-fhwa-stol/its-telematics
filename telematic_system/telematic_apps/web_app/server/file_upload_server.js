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
 *
 * Description:
 * An http server that provides APIs to serve file upload request and file list request.
 *
 * - requestListener: A listener to inspect request URL and dispatch the request further to other listeners.
 * - health_check: A function to provide a response of the server running status.
 * - postListener: A listener to serve all post request and provide corresponding response.
 *
 * Revision:
 * Update response headers to allow passing credentials and authentication parameters.
 */
const http = require("http");
const formidable = require("formidable");
require("dotenv").config();
const {
  uploadFile,
  validateFileExist,
} = require("./file_upload/file_upload_service");
const { listAllFiles } = require("./file_upload/file_list_service");
const { verifyToken } = require("./utils/verify_token");
const { updateDescription } = require("./controllers/file_info.controller");
const { createNatsConn } = require("./nats_client/nats_connection");
const {
  pubFileProcessingReq,
} = require("./nats_client/file_processing_nats_publisher");
const port = process.env.UPLOAD_HTTP_PORT;
const allowedOrigins = process.env.ALLOW_CLIENT_URL.split(",");
const uploadTimeout = parseInt(process.env.UPLOAD_TIME_OUT, 3600000);
const HTTP_METHODS = {
  POST: "POST",
  GET: "GET",
};

const HTTP_URLS = {
  API_FILE_UPLOAD: "/api/upload",
  API_FILE_UPLOADED_LIST: "/api/upload/list/all",
  API_FILE_DESCRIPTION_UPDATE: "/api/upload/description",
  API_FILE_PROCESS_REQUEST: "/api/upload/process/request",
  API_FILE_VALIDATION_REQUEST: "/api/upload/validation",
};

const uploadDestPath = process.env.UPLOAD_DESTINATION_PATH;

const setResponseHeaders = (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Request-Headers", "*");
  res.setHeader("Access-Control-Request-Method", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Credentials", true);
};

const requestListener = function (req, res) {
  setResponseHeaders(req, res);

  if (req.method === HTTP_METHODS.POST) {
    if (!verifyToken(req)) {
      unAuthenticatedError(res);
      return;
    }
    postListener(req, res);
  } else {
    health_check(req, res);
  }
};

const health_check = (req, res) => {
  let data = { health_status: "OK" };
  sendResponse(res, 200, JSON.stringify(data));
};

const postListener = async (req, res) => {
  switch (req.url.split("?")[0]) {
    case HTTP_URLS.API_FILE_UPLOADED_LIST:
      formidable().parse(req, async (err, fields, files) => {
        await listAllFiles(req, res)
          .then((data) => {
            sendResponse(res, 200, data);
          })
          .catch((err) => {
            serverError(res, err);
          });
      });
      break;
    case HTTP_URLS.API_FILE_UPLOAD:
      await uploadFile(req)
        .then((data) => {
          sendResponse(res, 200, data);
        })
        .catch((err) => {
          serverError(res, err);
        });
      break;
    case HTTP_URLS.API_FILE_DESCRIPTION_UPDATE:
      formidable().parse(req, async (err, fields, files) => {
        let fileInfo = JSON.parse(fields["fields"]);
        await updateDescription(fileInfo)
          .then((data) => {
            sendResponse(res, 200, data);
          })
          .catch((err) => {
            serverError(res, err);
          });
      });
      break;
    case HTTP_URLS.API_FILE_PROCESS_REQUEST:
      formidable().parse(req, async (err, fields, files) => {
        try {
          let fileInfo = JSON.parse(fields["fields"]);
          //Send file process request to NATS
          let processingReq = {
            filepath: uploadDestPath + "/" + fileInfo.original_filename,
          };

          let natsConn = await createNatsConn();
          await pubFileProcessingReq(natsConn, processingReq);
          await natsConn.close();
          sendResponse(
            res,
            200,
            "Process request sent: " + fileInfo.original_filename
          );
        } catch (err) {
          serverError(res, err);
        }
      });
      break;
    case HTTP_URLS.API_FILE_VALIDATION_REQUEST:
      await formidable().parse(req, (err, fields, files) => {
        validateFileExist(req, fields)
          .then((found) => {
            if (found) {
              sendResponse(res, 409, {
                error:
                  "File validation error as at least one file is found in database!",
              });
            } else {
              sendResponse(res, 200, "success");
            }
          })
          .catch((err) => {
            console.log(err);
            serverError(res, err);
          });
      });
      break;
    default:
      health_check(req, res);
      break;
  }
};

const sendResponse = (res, statusCode, data) => {
  res.writeHead(statusCode);
  res.write(JSON.stringify(data));
  res.end();
};

const unAuthenticatedError = (res) => {
  res.writeHead(401);
  res.write(
    JSON.stringify({ error: "User unauthenticated or session expired!" })
  );
  res.end();
};

const serverError = (res, err) => {
  console.log(err);
  res.writeHead(500);
  res.write(JSON.stringify({ error: err?.message || "Unknown server error!" }));
  res.end();
};

const httpServer = http.createServer(requestListener).listen(port, () => {
  console.log(
    `Server is running on http://${port}. Allowed client urls: ${allowedOrigins.join(", ")}`
  );
});

httpServer.headersTimeout = uploadTimeout;
httpServer.keepAliveTimeout = uploadTimeout;
httpServer.timeout = uploadTimeout;
httpServer.requestTimeout = uploadTimeout;

module.exports = { httpServer };
