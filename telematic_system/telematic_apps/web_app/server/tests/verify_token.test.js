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
const jwt = require("jsonwebtoken");

process.env.SECRET = "test_secret";

const { verifyToken } = require("../utils/verify_token");

const SECRET = process.env.SECRET;

/** Create a signed JWT with a given expiry offset in seconds from now. */
const makeToken = (payload, expiresIn = "1h") =>
    jwt.sign(payload, SECRET, { expiresIn });

describe("verifyToken", () => {
    test("returns decoded payload for a valid, non-expired token", () => {
        const token = makeToken({ id: 1, username: "alice" });
        const req = { headers: { authorization: token } };

        const result = verifyToken(req);

        expect(result).toBeDefined();
        expect(result.id).toBe(1);
        expect(result.username).toBe("alice");
    });

    test("returns undefined when authorization header is absent", () => {
        const req = { headers: {} };
        expect(verifyToken(req)).toBeUndefined();
    });

    test("returns undefined when authorization header is an empty string", () => {
        const req = { headers: { authorization: "" } };
        expect(verifyToken(req)).toBeUndefined();
    });

    test("returns undefined for a token signed with the wrong secret", () => {
        const token = jwt.sign({ id: 2 }, "wrong_secret", { expiresIn: "1h" });
        const req = { headers: { authorization: token } };

        expect(verifyToken(req)).toBeUndefined();
    });

    test("returns undefined for a malformed / garbage token string", () => {
        const req = { headers: { authorization: "not.a.jwt" } };
        expect(verifyToken(req)).toBeUndefined();
    });

    test("returns undefined for an expired token", () => {
        // expiresIn: 1s then backdated — use a negative exp to create an already-expired token
        const expiredToken = jwt.sign(
            { id: 3, exp: Math.floor(Date.now() / 1000) - 60 },
            SECRET
        );
        const req = { headers: { authorization: expiredToken } };

        expect(verifyToken(req)).toBeUndefined();
    });

    test("returns undefined when exp equals exactly now (boundary — treated as expired)", () => {
        const token = jwt.sign(
            { id: 4, exp: Math.floor(Date.now() / 1000) - 1 },
            SECRET
        );
        const req = { headers: { authorization: token } };

        expect(verifyToken(req)).toBeUndefined();
    });
});
