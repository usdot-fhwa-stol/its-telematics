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
  const org = require("../controllers/org.controller");
  const {
    requireCurrentOrgAdminOrServerAdmin,
    requireOrgAdminOrServerAdmin,
    requireSelfOrServerAdmin,
  } = require("../utils/authorization");
  var router = require('express').Router();

  /* GET all organizations. */
  router.get('/all', org.findAll);
  //POST retrieve user role
  router.post('/role/get', requireSelfOrServerAdmin((req) => req.body && req.body.data && req.body.data.user_id), org.getUserRole);
  /***POST add user to organization */
  router.post('/user/add', requireOrgAdminOrServerAdmin((req) => req.body && req.body.data && req.body.data.org_id), org.addOrgUser);
  /***POST update user for organization */
  router.post('/user/update', requireOrgAdminOrServerAdmin((req) => req.body && req.body.data && req.body.data.org_id), org.updateOrgUser);
  /***POST update user for organization */
  router.post('/user/find', requireSelfOrServerAdmin((req) => req.body && req.body.data && req.body.data.user_id), org.findAllOrgsByUser);
  /***DELETE delete user from organization */
  router.delete('/user/delete', requireOrgAdminOrServerAdmin((req) => req.query && req.query.org_id), org.delOrgUser);
  /***Get all organization users */
  router.get('/all/users', requireCurrentOrgAdminOrServerAdmin, org.findAllOrgUsers);
  app.use('/api/org', router);

  module.exports = router;
}
