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
    const units = require("../controllers/units.controller");
    const { requireEditorOrAbove } = require("../utils/authorization");
    var router = require('express').Router();

    //Create a unit — requires Editor or Admin role
    router.post("/create", requireEditorOrAbove, units.create);

    //Retrieve all units
    router.get("/all", units.findAll);

    app.use('/api/units', router);

};