/*
 * Copyright (C) 2019-2026 LEIDOS.
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
const { org_user, user } = require("../models");
const { verifyToken } = require("./verify_token");

const ADMIN_ROLE = "Admin";

const findUserById = async (userId) => {
  if (userId === undefined || userId === null) {
    return undefined;
  }

  const users = await user.findAll({
    where: {
      id: userId,
    },
  });

  if (!Array.isArray(users) || users.length === 0) {
    return undefined;
  }

  return users[0];
};

const hasServerAdminAccess = (authUser) => Number(authUser && authUser.is_admin) === 1;

const loadAuthenticatedUser = async (req) => {
  const tokenUser = verifyToken(req);
  if (!tokenUser || tokenUser.id === undefined || tokenUser.id === null) {
    return undefined;
  }

  const dbUser = await findUserById(tokenUser.id);
  if (!dbUser) {
    return undefined;
  }

  return {
    ...tokenUser,
    id: dbUser.id,
    email: dbUser.email,
    is_admin: dbUser.is_admin,
    login: dbUser.login,
    name: dbUser.name,
    org_id: dbUser.org_id,
    username: dbUser.login,
  };
};

const isOrgAdmin = async (userId, orgId) => {
  if (userId === undefined || userId === null || orgId === undefined || orgId === null) {
    return false;
  }

  const memberships = await org_user.findAll({
    where: {
      user_id: userId,
      org_id: orgId,
    },
  });

  return Array.isArray(memberships) && memberships.some((membership) => membership.role === ADMIN_ROLE);
};

const requireServerAdmin = async (req, res, next) => {
  try {
    const authUser = await loadAuthenticatedUser(req);
    if (!authUser) {
      res.status(401).send({ message: "User session is expired", reason: "expire" });
      return;
    }

    if (!hasServerAdminAccess(authUser)) {
      res.status(403).send({ message: "Server administrator privileges are required." });
      return;
    }

    req.authUser = authUser;
    next();
  } catch (err) {
    res.status(500).send({ message: err.message || "Authorization failed." });
  }
};

const requireCurrentOrgAdminOrServerAdmin = async (req, res, next) => {
  try {
    const authUser = await loadAuthenticatedUser(req);
    if (!authUser) {
      res.status(401).send({ message: "User session is expired", reason: "expire" });
      return;
    }

    if (hasServerAdminAccess(authUser) || await isOrgAdmin(authUser.id, authUser.org_id)) {
      req.authUser = authUser;
      next();
      return;
    }

    res.status(403).send({ message: "Administrative privileges are required." });
  } catch (err) {
    res.status(500).send({ message: err.message || "Authorization failed." });
  }
};

const requireOrgAdminOrServerAdmin = (resolveOrgId) => async (req, res, next) => {
  try {
    const authUser = await loadAuthenticatedUser(req);
    if (!authUser) {
      res.status(401).send({ message: "User session is expired", reason: "expire" });
      return;
    }

    const orgId = resolveOrgId(req);
    if (orgId === undefined || orgId === null || orgId === "") {
      res.status(400).send({ message: "Organization identifier is required." });
      return;
    }

    if (hasServerAdminAccess(authUser) || await isOrgAdmin(authUser.id, orgId)) {
      req.authUser = authUser;
      next();
      return;
    }

    res.status(403).send({ message: "Administrative privileges are required for the requested organization." });
  } catch (err) {
    res.status(500).send({ message: err.message || "Authorization failed." });
  }
};

const requireSelfOrServerAdmin = (resolveUserId) => async (req, res, next) => {
  try {
    const authUser = await loadAuthenticatedUser(req);
    if (!authUser) {
      res.status(401).send({ message: "User session is expired", reason: "expire" });
      return;
    }

    const userId = resolveUserId(req);
    if (userId === undefined || userId === null || userId === "") {
      res.status(400).send({ message: "User identifier is required." });
      return;
    }

    if (hasServerAdminAccess(authUser) || Number(authUser.id) === Number(userId)) {
      req.authUser = authUser;
      next();
      return;
    }

    res.status(403).send({ message: "You are not authorized to access another user's administrative data." });
  } catch (err) {
    res.status(500).send({ message: err.message || "Authorization failed." });
  }
};

module.exports = {
  hasServerAdminAccess,
  isOrgAdmin,
  loadAuthenticatedUser,
  requireCurrentOrgAdminOrServerAdmin,
  requireOrgAdminOrServerAdmin,
  requireSelfOrServerAdmin,
  requireServerAdmin,
};
