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
    const events = require("../controllers/events.controller");
    const { requireEditorOrAbove } = require("../utils/authorization");
    var router = require('express').Router();

    //Create an event — requires Editor or Admin role
    router.post("/create", requireEditorOrAbove, events.create);

    //Retrieve events by criteria: location, testing type, event name
    router.get("/all", events.findAll);

    //Update an event by id — requires Editor or Admin role
    router.put('/update/:id', requireEditorOrAbove, events.update);

    //Delete an event by id — requires Editor or Admin role
    router.delete('/delete/:id', requireEditorOrAbove, events.delete);

    app.use('/api/events', router);

};