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
 * Shared password policy validation used by user registration and password reset.
 * Rejects passwords that match identity fields (username/email) and weak/guessable
 * passwords as determined by zxcvbn, and enforces a minimum length.
 */
const zxcvbn = require("zxcvbn");

const MIN_PASSWORD_LENGTH = 12;
//zxcvbn score is 0-4. Require at least a "reasonable" score (3) to be accepted.
const MIN_ZXCVBN_SCORE = 3;

/**
 * Validate a candidate password against the organization's password policy.
 * @param {string} password - the plain text password to validate
 * @param {string} username - the user's login/username, used as an identity field to reject as a password
 * @param {string} email - the user's email, used as an identity field to reject as a password
 * @returns {{valid: boolean, message: string|undefined}} validation result. If valid is false, message describes the reason.
 */
const validatePassword = (password, username, email) => {
    if (password === undefined || password === null || typeof password !== "string") {
        return { valid: false, message: "Password is required." };
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        return { valid: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` };
    }

    //Reject passwords that are the same as the username or email (identity fields)
    const lowerPassword = password.toLowerCase();
    if (username !== undefined && username !== null && lowerPassword === String(username).toLowerCase()) {
        return { valid: false, message: "Password cannot be the same as the username." };
    }
    if (email !== undefined && email !== null && lowerPassword === String(email).toLowerCase()) {
        return { valid: false, message: "Password cannot be the same as the email." };
    }

    //Use zxcvbn to catch weak passwords and variations of identity fields (e.g. username123!)
    const inputs = [username, email].filter((field) => field !== undefined && field !== null && field !== "");
    const result = zxcvbn(password, inputs);
    if (result.score < MIN_ZXCVBN_SCORE) {
        const feedback = result.feedback && result.feedback.warning ? result.feedback.warning : "Password is too weak or too easy to guess.";
        return { valid: false, message: feedback };
    }

    return { valid: true, message: undefined };
};

module.exports = { validatePassword, MIN_PASSWORD_LENGTH, MIN_ZXCVBN_SCORE };
