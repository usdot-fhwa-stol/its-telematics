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
jest.mock("../models", () => ({
    user: { findAll: jest.fn(), update: jest.fn() },
    org: { findAll: jest.fn() },
    org_user: { findAll: jest.fn(), create: jest.fn(), update: jest.fn(), destroy: jest.fn() },
    Sequelize: { literal: jest.fn((v) => v) },
}));

jest.mock("../utils/verify_token", () => ({ verifyToken: jest.fn() }));

const { user, org, org_user } = require("../models");
const { verifyToken } = require("../utils/verify_token");
const orgCtrl = require("../controllers/org.controller");

const makeRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn() });

describe("org.controller", () => {
    beforeEach(() => jest.clearAllMocks());

    // ── findAll ──────────────────────────────────────────────────────────────
    describe("findAll", () => {
        test("returns all organizations", async () => {
            org.findAll.mockResolvedValue([{ id: 1, name: "Test Org" }]);
            const res = makeRes();
            await orgCtrl.findAll({}, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith([{ id: 1, name: "Test Org" }]);
        });

        test("returns 500 on DB error", async () => {
            org.findAll.mockRejectedValue(new Error("DB error"));
            const res = makeRes();
            await orgCtrl.findAll({}, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ── findAllOrgsByUser ────────────────────────────────────────────────────
    describe("findAllOrgsByUser", () => {
        test("returns 400 when body is missing user_id", async () => {
            const res = makeRes();
            await orgCtrl.findAllOrgsByUser({ body: { data: {} } }, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test("returns orgs for a valid user_id", async () => {
            org_user.findAll.mockResolvedValue([{ org_id: 1 }]);
            const res = makeRes();
            await orgCtrl.findAllOrgsByUser({ body: { data: { user_id: 5 } } }, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    // ── getUserRole ──────────────────────────────────────────────────────────
    describe("getUserRole", () => {
        test("returns 400 when body is missing org_id or user_id", async () => {
            const res = makeRes();
            await orgCtrl.getUserRole({ body: { data: { org_id: 1 } } }, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test("returns role for valid org_id and user_id", async () => {
            org_user.findAll.mockResolvedValue([{ role: "Editor" }]);
            const res = makeRes();
            await orgCtrl.getUserRole({ body: { data: { org_id: 1, user_id: 2 } } }, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    // ── addOrgUser ───────────────────────────────────────────────────────────
    describe("addOrgUser", () => {
        test("returns 400 when body is missing required fields", async () => {
            const res = makeRes();
            await orgCtrl.addOrgUser({ body: {} }, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test("returns 400 for an invalid role", async () => {
            const res = makeRes();
            await orgCtrl.addOrgUser({
                body: { data: { org_id: 1, user_id: 2, role: "SuperUser" } }
            }, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringContaining("Invalid organization role") })
            );
        });

        test("returns 400 for unexpected payload fields", async () => {
            const res = makeRes();
            await orgCtrl.addOrgUser({
                body: { data: { org_id: 1, user_id: 2, role: "Editor", is_admin: 1 } }
            }, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringContaining("Unexpected organization-user fields") })
            );
        });

        test("creates org user for a valid payload", async () => {
            org_user.create.mockResolvedValue({ org_id: 1, user_id: 2, role: "Editor" });
            const res = makeRes();
            await orgCtrl.addOrgUser({
                body: { data: { org_id: 1, user_id: 2, role: "Editor" } }
            }, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    // ── updateOrgUser ────────────────────────────────────────────────────────
    describe("updateOrgUser", () => {
        test("returns 400 when body is missing required fields", async () => {
            const res = makeRes();
            await orgCtrl.updateOrgUser({ body: { data: { org_id: 1 } } }, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test("returns 400 for an invalid role", async () => {
            const res = makeRes();
            await orgCtrl.updateOrgUser({
                body: { data: { org_id: 1, user_id: 2, role: "Owner" } }
            }, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test("updates org user and returns updated record for a valid payload", async () => {
            org_user.update.mockResolvedValue([1]);
            org_user.findAll.mockResolvedValue([{ org_id: 1, user_id: 2, role: "Admin" }]);
            const res = makeRes();
            await orgCtrl.updateOrgUser({
                body: { data: { org_id: 1, user_id: 2, role: "Admin" } }
            }, res);
            expect(org_user.update).toHaveBeenCalled();
        });
    });

    // ── delOrgUser ───────────────────────────────────────────────────────────
    describe("delOrgUser", () => {
        test("returns 400 when query params are missing", async () => {
            const res = makeRes();
            await orgCtrl.delOrgUser({ query: {} }, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test("moves user to default org when it is their last membership", async () => {
            // Only 1 membership — should update to default org
            org_user.findAll.mockResolvedValue([{ org_id: 2, user_id: 5 }]);
            org_user.update.mockResolvedValue([1]);
            user.update.mockResolvedValue([1]);
            const res = makeRes();
            await orgCtrl.delOrgUser({ query: { user_id: "5", org_id: "2" } }, res);
            expect(org_user.update).toHaveBeenCalled();
        });

        test("destroys org membership when user has multiple orgs", async () => {
            org_user.findAll.mockResolvedValue([
                { org_id: 1, user_id: 5 },
                { org_id: 2, user_id: 5 },
            ]);
            org_user.destroy.mockResolvedValue(1);
            const res = makeRes();
            await orgCtrl.delOrgUser({ query: { user_id: "5", org_id: "2" } }, res);
            expect(org_user.destroy).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test("returns 400 when destroy finds nothing to delete", async () => {
            org_user.findAll.mockResolvedValue([
                { org_id: 1, user_id: 5 },
                { org_id: 2, user_id: 5 },
            ]);
            org_user.destroy.mockResolvedValue(0);
            const res = makeRes();
            await orgCtrl.delOrgUser({ query: { user_id: "5", org_id: "2" } }, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    // ── findAllOrgUsers ──────────────────────────────────────────────────────
    describe("findAllOrgUsers", () => {
        test("returns 401 when authUser is not set and token is invalid", async () => {
            verifyToken.mockReturnValue(null);
            const req = { headers: {}, authUser: undefined };
            const res = makeRes();
            await orgCtrl.findAllOrgUsers(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        test("returns org users for a server admin (all orgs)", async () => {
            const req = { authUser: { id: 1, is_admin: 1, org_id: 1 } };
            org_user.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
            const res = makeRes();
            await orgCtrl.findAllOrgUsers(req, res);
            expect(org_user.findAll).toHaveBeenCalledWith({ where: {} });
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test("scopes query to current org for an org admin", async () => {
            // First call: isOrgAdmin lookup — membership with Admin role
            // Second call: findAllOrgUsers result
            org_user.findAll
                .mockResolvedValueOnce([{ role: "Admin" }])
                .mockResolvedValueOnce([{ id: 3 }]);
            const req = { authUser: { id: 5, is_admin: 0, org_id: 7 } };
            const res = makeRes();
            await orgCtrl.findAllOrgUsers(req, res);
            expect(org_user.findAll).toHaveBeenCalledWith({ where: { org_id: 7 } });
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test("returns 403 for a non-admin user", async () => {
            org_user.findAll.mockResolvedValueOnce([]); // not an org admin
            const req = { authUser: { id: 5, is_admin: 0, org_id: 7 } };
            const res = makeRes();
            await orgCtrl.findAllOrgUsers(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });
});
