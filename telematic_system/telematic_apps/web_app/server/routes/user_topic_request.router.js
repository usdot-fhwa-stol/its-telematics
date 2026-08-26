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
module.exports = app => {
    const user_topic_request = require("../controllers/user_topic_request.controller");
    const { requireEditorOrAbove } = require("../utils/authorization");
    var router = require('express').Router();

    //Create or update a user_topic_request — requires Editor or Admin role
    router.post("/upsert", requireEditorOrAbove, user_topic_request.createOrUpdate);

    //Retrieve user_topic_request by criteria: event_id and unit_identifier
    router.get("/all", user_topic_request.findAllUserRequestByEventUnit);

    //Retrieve user_topic_request by criteria: event_id and unit_identifier
    router.get("/user/list", user_topic_request.findUserRequestByUserEventUnit);

    app.use('/api/user_topic_request', router);

};