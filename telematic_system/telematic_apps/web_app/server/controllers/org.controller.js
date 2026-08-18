/*
 * Copyright (C) 2019-2023 LEIDOS.
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

const { user, org_user, org, Sequelize } = require("../models");
const { hasServerAdminAccess, isOrgAdmin, loadAuthenticatedUser } = require("../utils/authorization");

const ALLOWED_ORG_USER_UPDATE_FIELDS = ["org_id", "user_id", "role"];
const ALLOWED_ORG_ROLES = ["Admin", "Editor", "Viewer"];

const sanitizeOrgUserPayload = (payload) => {
    const source = payload || {};
    const unexpectedFields = Object.keys(source).filter((field) => !ALLOWED_ORG_USER_UPDATE_FIELDS.includes(field));
    if (unexpectedFields.length > 0) {
        return {
            valid: false,
            message: `Unexpected organization-user fields: ${unexpectedFields.join(", ")}.`
        };
    }

    if (!ALLOWED_ORG_ROLES.includes(source.role)) {
        return {
            valid: false,
            message: `Invalid organization role: ${source.role}.`
        };
    }

    return {
        valid: true,
        data: {
            org_id: source.org_id,
            user_id: source.user_id,
            role: source.role
        }
    };
};
/**
 *@brief Find all organizations
 * @Return Response status and a list of organizations
 */
exports.findAll = (req, res) => {
    org.findAll()
        .then(data => {
            res.status(200).send(data);
        }).catch(err => {
            res.status(500).send({
                message: err.message || "Error while findAll organizations."
            });
        });
}

exports.findAllOrgUsers = async (req, res) => {
    try {
        const authUser = req.authUser || await loadAuthenticatedUser(req);
        if (!authUser) {
            res.status(401).send({ message: "User session is expired", reason: "expire" });
            return;
        }

        let condition = {};
        if (!hasServerAdminAccess(authUser)) {
            const isCurrentOrgAdmin = await isOrgAdmin(authUser.id, authUser.org_id);
            if (!isCurrentOrgAdmin) {
                res.status(403).send({ message: "Administrative privileges are required." });
                return;
            }

            condition = {
                org_id: authUser.org_id
            };
        }

        org_user.findAll({
            where: condition
        })
            .then(data => {
                res.status(200).send(data);
            }).catch(err => {
                res.status(500).send({
                    message: err.message || "Error while findAll organizations."
                });
            });
    } catch (err) {
        res.status(500).send({
            message: err.message || "Error while authorizing organization users."
        });
    }
}


exports.findAllOrgsByUser = (req, res) => {
    if (!req.body || req.body.data === undefined || !req.body.data.user_id) {
        res.status(400).send({
            message: "Content cannot be empty."
        });
        return;
    }
    org_user.findAll({
        where: {
            user_id: req.body.data.user_id
        }
    })
        .then(data => {
            res.status(200).send(data);
        }).catch(err => {
            res.status(500).send({
                message: err.message || "Error while find user organizations."
            });
        });
}


exports.getUserRole = (req, res) => {
    if (!req.body || !req.body.data || !req.body.data.org_id || !req.body.data.user_id) {
        res.status(400).send({
            message: "Content cannot be empty."
        });
        return;
    }
    org_user.findAll({
        where: {
            org_id: req.body.data.org_id,
            user_id: req.body.data.user_id
        }
    })
        .then(data => {
            res.status(200).send(data);
        }).catch(err => {
            res.status(500).send({
                message: err.message || "Error while findAll organizations."
            });
        });
}

exports.addOrgUser = (req, res) => {
    if (!req.body || !req.body.data || !req.body.data.org_id || !req.body.data.user_id) {
        res.status(400).send({
            message: "Content cannot be empty."
        });
        return;
    }

    const sanitizedUser = sanitizeOrgUserPayload(req.body.data);
    if (!sanitizedUser.valid) {
        res.status(400).send({
            message: sanitizedUser.message
        });
        return;
    }

    org_user.create(sanitizedUser.data)
        .then(data => {
            res.status(200).send(data);
        }).catch(err => {
            res.status(500).send({
                message: err.message || "Error while adding user to an organization."
            });
        });
}

exports.updateOrgUser = (req, res) => {
    if (!req.body || !req.body.data || !req.body.data.org_id || !req.body.data.user_id) {
        res.status(400).send({
            message: "Content cannot be empty."
        });
        return;
    }

    const sanitizedUser = sanitizeOrgUserPayload(req.body.data);
    if (!sanitizedUser.valid) {
        res.status(400).send({
            message: sanitizedUser.message
        });
        return;
    }

    const updatedOrgUser = {
        role: sanitizedUser.data.role,
        updated: Sequelize.literal('CURRENT_TIMESTAMP')
    };
    org_user.update(updatedOrgUser, {
        where: {
            org_id: sanitizedUser.data.org_id,
            user_id: sanitizedUser.data.user_id
        }
    })
        .then(data => {
            //Find the updated user
            org_user.findAll({
                where: {
                    org_id: sanitizedUser.data.org_id,
                    user_id: sanitizedUser.data.user_id
                }
            })
                .then(result => {
                    res.status(200).send(result);
                }).catch(err => {
                    res.status(500).send({
                        message: err.message || "Error while findAll organizations."
                    });
                });
        }).catch(err => {
            res.status(500).send({
                message: err.message || "Error while updating user for an organization."
            });
        });
}

exports.delOrgUser = (req, res) => {
    if (!req.query || !req.query.user_id || !req.query.org_id) {
        res.status(400).send({
            message: "Request content cannot be empty."
        });
        return;
    }
    org_user.findAll({
        where: {
            user_id: req.query.user_id
        }
    }).then(data => {
        if (data !== undefined && Array.isArray(data)) {
            //If the organization to be removed is the last organization belong to this user, update this user organization to default organization (Main. Org) and default role viewer
            if (data.length === 1) {
                org_user.update({
                    org_id: 1,
                    role: 'Viewer'
                },
                    {
                        where: {
                            user_id: req.query.user_id,
                            org_id: req.query.org_id,
                        }
                    }).then(orgData => {
                        console.log(orgData)
                        user.update({ org_id: 1 }, {
                            where: {
                                id: req.query.user_id
                            }
                        })
                            .then(resData => {
                                res.status(200).send(resData);
                            }).catch(err => {
                                res.status(500).send({
                                    message: err.message || "Error while updating user for an organization."
                                });
                            });
                    })
            } else {
                org_user.destroy({
                    where: {
                        user_id: req.query.user_id,
                        org_id: req.query.org_id
                    }
                })
                    .then(num => {
                        if (num < 1) {
                            res.status(400).send({ message: `Cannot delete Org user id =${req.query.user_id}. Maybe Org user was not found or request body was empty.` });
                        } else {
                            res.status(200).send({ message: "Org user was deleted successfully." });
                        }
                    }).catch(err => {
                        res.status(500).send({
                            message: err.message || "Error while remove user for an organization."
                        });
                    });
            }
        }
    });
}
