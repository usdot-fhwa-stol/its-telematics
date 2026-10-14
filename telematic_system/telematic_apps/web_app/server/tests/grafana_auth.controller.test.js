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
const jwt = require("jsonwebtoken");

// Set SECRET before requiring the controller so jwt.verify uses it
process.env.SECRET = "test-secret";

const grafanaAuthController = require("../controllers/grafana_auth.controller");

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const signToken = (payload, secret = "test-secret", opts = {}) =>
    jwt.sign(payload, secret, opts);

describe("grafana_auth.controller", () => {
    beforeEach(() => jest.clearAllMocks());

    // ── authenticateWithSession ───────────────────────────────────────────────
    describe("authenticateWithSession", () => {
        it("returns 401 when no Authorization header is present", () => {
            const req = { headers: {} };
            const res = mockRes();
            grafanaAuthController.authenticateWithSession(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: "No session token provided" });
        });

        it("returns 401 when token has no username claim", () => {
            const token = signToken({ id: 1 });
            const req = { headers: { authorization: token } };
            const res = mockRes();
            grafanaAuthController.authenticateWithSession(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: "Invalid session token" });
        });

        it("returns 401 when token is signed with wrong secret", () => {
            const token = signToken({ username: "alice" }, "wrong-secret");
            const req = { headers: { authorization: token } };
            const res = mockRes();
            grafanaAuthController.authenticateWithSession(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ error: "Authentication failed" })
            );
        });

        it("returns 401 when token is expired", () => {
            const token = signToken({ username: "alice" }, "test-secret", { expiresIn: -1 });
            const req = { headers: { authorization: token } };
            const res = mockRes();
            grafanaAuthController.authenticateWithSession(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it("returns grafana token with success=true for valid session token", () => {
            const token = signToken({ username: "alice" });
            const req = { headers: { authorization: token } };
            const res = mockRes();
            grafanaAuthController.authenticateWithSession(req, res);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    username: "alice",
                    token: expect.any(String),
                    expiresIn: "1h"
                })
            );
        });

        it("grafana token contains purpose=grafana_auth claim", () => {
            const token = signToken({ username: "alice" });
            const req = { headers: { authorization: token } };
            const res = mockRes();
            grafanaAuthController.authenticateWithSession(req, res);
            const grafanaToken = res.json.mock.calls[0][0].token;
            const decoded = jwt.verify(grafanaToken, "test-secret");
            expect(decoded.purpose).toBe("grafana_auth");
        });
    });

    // ── validate ──────────────────────────────────────────────────────────────
    describe("validate", () => {
        it("returns 400 when no token query param provided", () => {
            const req = { query: {} };
            const res = mockRes();
            grafanaAuthController.validate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "No token provided" });
        });

        it("returns valid=false and 401 for invalid token", () => {
            const req = { query: { token: "invalid.token.here" } };
            const res = mockRes();
            grafanaAuthController.validate(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ valid: false })
            );
        });

        it("returns valid=false and 401 for expired token", () => {
            const token = signToken({ username: "alice", purpose: "grafana_auth" }, "test-secret", { expiresIn: -1 });
            const req = { query: { token } };
            const res = mockRes();
            grafanaAuthController.validate(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ valid: false }));
        });

        it("returns decoded claims for a valid grafana token", () => {
            const token = signToken(
                { username: "alice", purpose: "grafana_auth" },
                "test-secret",
                { expiresIn: "1h" }
            );
            const req = { query: { token } };
            const res = mockRes();
            grafanaAuthController.validate(req, res);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    valid: true,
                    username: "alice",
                    purpose: "grafana_auth",
                    issuedAt: expect.any(String),
                    expiresAt: expect.any(String)
                })
            );
        });
    });
});
