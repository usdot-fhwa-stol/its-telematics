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
    const default_event_topics = require("../controllers/default_event_topics.controller");
    const { requireEditorOrAbove } = require("../utils/authorization");
    var router = require('express').Router();

    //Create a default_event_topics — requires Editor or Admin role
    router.post("/create", requireEditorOrAbove, default_event_topics.create);

    //Retrieve default_event_topics by criteria: event_id and unit_identifier
    router.get("/all", default_event_topics.findAll);

    app.use('/api/default_event_topics', router);

};