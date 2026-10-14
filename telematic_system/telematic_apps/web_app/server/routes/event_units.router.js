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
    const event_unit = require("../controllers/event_units.controller");
    const { requireEditorOrAbove } = require("../utils/authorization");
    var router = require('express').Router();

    //Assign unit to an event — requires Editor or Admin role
    router.post('/create', requireEditorOrAbove, event_unit.create)

    //Unassign unit from an event — requires Editor or Admin role
    router.delete('/delete', requireEditorOrAbove, event_unit.delete)

    app.use('/api/event_units', router);

};