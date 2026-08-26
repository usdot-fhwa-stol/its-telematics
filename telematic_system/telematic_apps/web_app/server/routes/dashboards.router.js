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
    const dashboards = require("../controllers/dashboards.controller");
    const { requireEditorOrAbove } = require("../utils/authorization");
    var router = require('express').Router();
  
    /* GET all dashboards belong to an organization. */
    router.post('/org/all', dashboards.findDashboardsByOrg);
    router.post('/org/search', dashboards.searchDashboardsByOrg);
    /* Modify event dashboards — requires Editor or Admin role */
    router.post('/event/update', requireEditorOrAbove, dashboards.updateEventDashboards);
    router.delete('/event/delete', requireEditorOrAbove, dashboards.deleteEventDashboards);
    router.post('/event/list', dashboards.listEventDashboards);
    app.use('/api/dashboards', router);
  
    module.exports = router;
  }
  