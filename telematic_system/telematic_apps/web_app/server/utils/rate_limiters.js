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
 *
 * Description:
 * Rate limiters to slow down automated credential-stuffing/password-spraying and
 * username-enumeration attacks against the login and registration endpoints.
 */
const rateLimit = require("express-rate-limit");

//Allow a limited number of login attempts per IP address in a 15 minute window.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: (req, res) => ({
        message: `Too many login attempts (${req.rateLimit.current} of ${req.rateLimit.limit} allowed). Please try again later in 15 minutes.`,
    }),
});

//Allow a limited number of registration attempts per IP address in a 1 hour window.
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: (req, res) => ({
        message: `Too many registration attempts (${req.rateLimit.current} of ${req.rateLimit.limit} allowed). Please try again later in 1 hour.`,
    }),
});

module.exports = { loginLimiter, registerLimiter };
