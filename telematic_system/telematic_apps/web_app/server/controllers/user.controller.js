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
var manager = require('htpasswd-mgr');
const saltHash = require('password-salt-and-hash')
const { org_user, org, user, Sequelize } = require("../models");
const { Op } = require("sequelize");
const { addOrgUser } = require('./org.controller');
const getUuid = require('uuid-by-string');
const jwt = require("jsonwebtoken");
const { hasServerAdminAccess, isOrgAdmin, loadAuthenticatedUser } = require('../utils/authorization');
const { validatePassword } = require('../utils/password_policy');
require('dotenv').config();
var grafana_htpasswd = process.env.GRAFANA_HTPASSWORD!=undefined && process.env.GRAFANA_HTPASSWORD.length > 0 ? process.env.GRAFANA_HTPASSWORD : '/opt/apache2/grafana_htpasswd';
var htpasswordManager = manager(grafana_htpasswd)

const RESTRICTED_PRIVILEGE_FIELDS = ["is_admin", "role", "permissions"];

const findUnexpectedFields = (payload, allowedFields) => Object.keys(payload || {}).filter((field) => !allowedFields.includes(field));

const findRestrictedPrivilegeFields = (payload) => RESTRICTED_PRIVILEGE_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(payload || {}, field)
);

const normalizeAdminFlag = (value) => {
    const normalizedValue = Number(value);
    if (normalizedValue !== 0 && normalizedValue !== 1) {
        return undefined;
    }
    return normalizedValue;
};

const getCurrentOrgRole = async (userId, orgId) => {
    const orgUsers = await org_user.findAll({
        where: {
            user_id: userId,
            org_id: orgId
        }
    });

    if (!Array.isArray(orgUsers) || orgUsers.length === 0) {
        return "";
    }

    return orgUsers[0].role || "";
};
/**
 * Update user server admin role by using the user identifier and their server admin role to update
 */
exports.updateUserServerAdmin = (req, res) => {
    if (!req.body || req.body.is_admin === undefined || req.body.user_id === undefined) {
        res.status(400).send({
            message: "Content cannot be empty."
        });
        return;
    }

    const unexpectedFields = findUnexpectedFields(req.body, ["user_id", "is_admin"]);
    if (unexpectedFields.length > 0) {
        res.status(400).send({
            message: `Unexpected update fields: ${unexpectedFields.join(", ")}.`
        });
        return;
    }

    const isAdmin = normalizeAdminFlag(req.body.is_admin);
    if (isAdmin === undefined) {
        res.status(400).send({
            message: "is_admin must be either 0 or 1."
        });
        return;
    }

    user.update({ is_admin: isAdmin }, {
        where: {
            id: req.body.user_id
        }
    })
        .then(data => {
            if (data > 0) {
                res.status(200).send({
                    message: `Successfully updated server admin for user id = ${req.body.user_id}.`
                });
            } else {
                res.status(400).send({
                    message: `Failed to update server admin for user id = ${req.body.user_id}.`
                });
            }
        }).catch(err => {
            res.status(500).send({
                message: err.message || "Error while updating user for an organization."
            });
        });
}

/***
 * Register a new user. The user has to provide valid username, password, email, and the organization 
 */
exports.registerUser = (req, res) => {
    if (req == undefined || req.body == undefined || req.body.username == undefined
        || req.body.org_id == undefined || req.body.email == undefined || req.body.password == undefined) {
        res.sendStatus(400);
        return;
    }

    const restrictedPrivilegeFields = findRestrictedPrivilegeFields(req.body);
    if (restrictedPrivilegeFields.length > 0) {
        res.status(400).send({
            message: `Request cannot include restricted administrative fields: ${restrictedPrivilegeFields.join(", ")}.`
        });
        return;
    }

    //Reject weak passwords or passwords that match identity fields (username/email)
    const passwordCheck = validatePassword(req.body.password, req.body.username, req.body.email);
    if (!passwordCheck.valid) {
        res.status(400).send({ message: passwordCheck.message });
        return;
    }

    user.findAll({
        where: {
            [Op.or]: [
                { login: req.body.username },
                { email: req.body.email }
            ]
        }
    }).then(data => {
        //Check if username is already used. If used, send error response      
        if (data !== undefined && Array.isArray(data) && data.length > 0) {
            res.status(404).send({
                message: "Username or email already exist."
            });
        } else {
            try {
                //Encrypt password
                let hashPassword = saltHash.generateSaltHash(req.body.password);

                //If valid request, create user           
                var registerUser = {
                    login: req.body.username,
                    email: req.body.email,
                    password: hashPassword.password,
                    salt: hashPassword.salt,
                    org_id: req.body.org_id
                }
                user.create(registerUser).then(data => {
                    //If usr is created, add user to the requested organization
                    var registerOrgUser = {
                        org_id: data.org_id,
                        user_id: data.id,
                        role: "Viewer"
                    }
                    org_user.create(registerOrgUser)
                        .then(data => {
                            res.status(201).send({ message: "Successfully registered user." });
                        }).catch(err => {
                            res.status(500).send("Error while adding user to an organization.");
                        });
                }).catch(err => {
                    console.log(err)
                    res.status(500).send({
                        message: "Server error while registering user."
                    });
                });
            } catch (error) {
                console.error("Server error while hashing password");
                res.status(500).send({
                    message: "Server error while hashing user password."
                });
                return;
            }
        }
    }).catch(err => {
        console.log(err)
        res.status(404).send({
            message: "Error while checking user."
        });
    });
};

/**
 * User can update their password by providing valid username and email
 */
exports.forgetPwd = (req, res) => {
    if (req.body == undefined || req.body.username == undefined
        || req.body.email == undefined || req.body.new_password == undefined) {
        res.sendStatus(400);
        return;
    }

    const restrictedPrivilegeFields = findRestrictedPrivilegeFields(req.body);
    if (restrictedPrivilegeFields.length > 0) {
        res.status(400).send({
            message: `Request cannot include restricted administrative fields: ${restrictedPrivilegeFields.join(", ")}.`
        });
        return;
    }

    //Reject weak passwords or passwords that match identity fields (username/email)
    const passwordCheck = validatePassword(req.body.new_password, req.body.username, req.body.email);
    if (!passwordCheck.valid) {
        res.status(400).send({ message: passwordCheck.message });
        return;
    }

    user.findAll({
        where: {
            [Op.and]: [
                { login: req.body.username },
                { email: req.body.email }
            ]
        }
    }).then(data => {
        if (data !== undefined && Array.isArray(data) && data.length > 0) {
            let hashPassword = saltHash.generateSaltHash(req.body.new_password);
            user.update({ password: hashPassword.password, salt: hashPassword.salt }, {
                where: {
                    id: data[0].id
                }
            })
                .then(data => {
                    if (data > 0) {
                        //Update user credential file
                        htpasswordManager.upsertUser(req.body.username, req.body.new_password).then((status) => {
                            res.status(200).send({ message: `Successfully updated password for user ${req.body.username}` });
                        }).catch((err) => {
                            console.log(err)
                            res.status(500).send({ message: "Server error while updating user." });
                        });
                    } else {
                        res.status(500).send({ message: `Cannot find this user.` });
                    }
                }).catch(err => {
                    res.status(500).send({ message: "Server Error while updating user password." });
                });
        } else {
            res.status(400).send({ message: `Failed to update user password due to incorrect username or email.` });
        }
    }).catch(err => {
        console.log(err)
        res.status(500).send({ message: "Server error while checking user existence." });
    });
}

exports.getCurrentUserAccess = async (req, res) => {
    try {
        const authUser = req.authUser || await loadAuthenticatedUser(req);
        if (!authUser) {
            res.status(401).send({ message: "User session is expired", reason: "expire" });
            return;
        }

        const role = await getCurrentOrgRole(authUser.id, authUser.org_id);
        const isServerAdmin = hasServerAdminAccess(authUser);
        const canAccessUserList = isServerAdmin || role === "Admin";

        res.status(200).send({
            user_id: authUser.id,
            org_id: authUser.org_id,
            role: role,
            is_admin: isServerAdmin ? "yes" : "no",
            can_access_user_list: canAccessUserList
        });
    } catch (err) {
        console.log(err)
        res.status(500).send({
            message: err.message || "Error while retrieving current user access."
        });
    }
}

/***
 * Authenticate a user when attempting to login to the system
 */
exports.loginUser = (req, res) => {
    if (req.body == undefined || req.body.password == undefined
        || req.body.username == undefined) {
        res.status(400).send({ message: "Content is empty" });
        return;
    }
    user.findAll({
        where: {
            [Op.and]: [
                { login: req.body.username }
            ]
        }
    }).then(data => {
        if (data !== undefined && Array.isArray(data) && data.length > 0) {
            //Checking if user password match
            let is_pwd_match = saltHash.verifySaltHash(data[0].salt, data[0].password, req.body.password);
            if (is_pwd_match) {
                console.log("User authenticated successfully.");
                //Update user credential file
                htpasswordManager.upsertUser(req.body.username, req.body.password).then((status) => {
                    console.log("User credential file updated.");
                    //get org name
                    org.findAll({ where: { id: data[0].org_id } }).then(org_data => {
                        if (org_data.length > 0) {
                            let result = {
                                id: data[0].id,
                                last_seen_at: data[0].last_seen_at,
                                is_admin: data[0].is_admin,
                                email: data[0].email,
                                name: data[0].name,
                                org_id: data[0].org_id,
                                login: data[0].login,
                                username: data[0].login,
                                org_name: org_data[0].name
                            }
                            //Creating jwt token, and the token expire in an hour
                            let token = jwt.sign(
                                result,
                                process.env.SECRET,
                                { expiresIn: "1h" });
                            result.token = token;
                            result.tokenExpiredAt = Math.round(new Date().getTime() / 1000) + 3600;
                            res.status(200).send(result);
                        }
                    });
                }).catch((err) => {
                    console.error(err)
                    res.status(500).send({ message: "Server error while user login." });
                });
            } else {
                res.status(401).send({ message: "Failed to authenticate user." });
            }
        } else {
            res.status(401).send({ message: `Failed to authenticate user = ${req.body.username} , password = ${req.body.password} ` });
        }
    }).catch(err => {
        
        res.status(500).send({ message: "Error while authenticating user." });
    });
}

/***
 * When a user logout, clear the user from the credential file
 */
exports.deleteUser = async (req, res) => {
    if (!req?.query?.username){
        res.sendStatus(400);
        return;
    }
    try {
        await htpasswordManager.removeUser(req.query.username);
        res.sendStatus(200);
    } catch (err) {
        console.error('User %s logout error:', req?.query?.username, err);
        res.sendStatus(501);
    }
}

/***
 * Retrieve all existing users in the database
 */
exports.findAll = async (req, res) => {
    try {
        const authUser = req.authUser || await loadAuthenticatedUser(req);
        if (!authUser) {
            res.status(401).send({ message: "User session is expired", reason: "expire" });
            return;
        }

        var condition = {};
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

        user.findAll({
            where: condition
        })
            .then(data => {
                if (data !== undefined && Array.isArray(data) && data.length > 0) {
                    let response = [];
                    data.forEach(user => {
                        response.push({
                            id: user.id,
                            last_seen_at: user.last_seen_at,
                            is_admin: user.is_admin === 1 ? "yes" : "no",
                            login: user.login,
                            org_id: user.org_id,
                            email: user.email
                        });
                    });
                    res.status(200).send(response);
                }
            }).catch(err => {
                console.log(err)
                res.status(500).send({
                    message: err.message || "Error while findAll users."
                });
            });
    } catch (err) {
        console.log(err)
        res.status(500).send({
            message: err.message || "Error while authorizing users list."
        });
    }
};
