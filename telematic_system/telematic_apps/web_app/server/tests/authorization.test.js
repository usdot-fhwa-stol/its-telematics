jest.mock("../models", () => ({
    user: { findAll: jest.fn() },
    org_user: { findAll: jest.fn() },
}));

jest.mock("../utils/verify_token", () => ({
    verifyToken: jest.fn(),
}));

const { user, org_user } = require("../models");
const { verifyToken } = require("../utils/verify_token");
const {
    getOrgRole,
    hasServerAdminAccess,
    isOrgAdmin,
    loadAuthenticatedUser,
    requireAuthenticated,
    requireCurrentOrgAdminOrServerAdmin,
    requireEditorOrAbove,
    requireOrgAdminOrServerAdmin,
    requireSelfOrServerAdmin,
    requireServerAdmin,
} = require("../utils/authorization");

// ── Shared helpers ────────────────────────────────────────────────────────────

const makeDbUser = (overrides = {}) => ({
    id: 9,
    is_admin: 0,
    org_id: 2,
    login: "db-user",
    email: "db-user@example.com",
    name: "DB User",
    ...overrides,
});

const makeReq = () => ({ headers: { authorization: "token" } });
const makeRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn() });

/** Set up verifyToken + user.findAll for a standard authenticated non-admin user. */
const setupAuthUser = (overrides = {}) => {
    const dbUser = makeDbUser(overrides);
    verifyToken.mockReturnValue({ id: dbUser.id, is_admin: dbUser.is_admin, org_id: dbUser.org_id });
    user.findAll.mockResolvedValue([dbUser]);
    return dbUser;
};

describe("authorization", () => {
    beforeEach(() => jest.clearAllMocks());

    // ── hasServerAdminAccess ──────────────────────────────────────────────────

    describe("hasServerAdminAccess", () => {
        test("returns true when is_admin is 1", () => {
            expect(hasServerAdminAccess({ is_admin: 1 })).toBe(true);
        });

        test("returns false when is_admin is 0", () => {
            expect(hasServerAdminAccess({ is_admin: 0 })).toBe(false);
        });

        test("returns false when authUser is null", () => {
            expect(hasServerAdminAccess(null)).toBe(false);
        });

        test("returns false when authUser is undefined", () => {
            expect(hasServerAdminAccess(undefined)).toBe(false);
        });
    });

    // ── loadAuthenticatedUser ─────────────────────────────────────────────────

    describe("loadAuthenticatedUser", () => {
        test("reloads admin and org fields from the database", async () => {
            verifyToken.mockReturnValue({ id: 9, is_admin: 1, org_id: 99, username: "forged-user" });
            user.findAll.mockResolvedValue([makeDbUser()]);

            const authUser = await loadAuthenticatedUser({ headers: { authorization: "token" } });

            expect(authUser).toMatchObject({
                id: 9, is_admin: 0, org_id: 2,
                username: "db-user", login: "db-user",
                email: "db-user@example.com", name: "DB User",
            });
        });

        test("returns undefined when token is invalid", async () => {
            verifyToken.mockReturnValue(null);
            expect(await loadAuthenticatedUser({ headers: {} })).toBeUndefined();
        });

        test("returns undefined when token has no id", async () => {
            verifyToken.mockReturnValue({ email: "x@x.com" }); // no id field
            expect(await loadAuthenticatedUser({ headers: { authorization: "t" } })).toBeUndefined();
        });

        test("returns undefined when user is not found in DB", async () => {
            verifyToken.mockReturnValue({ id: 42 });
            user.findAll.mockResolvedValue([]);
            expect(await loadAuthenticatedUser({ headers: { authorization: "t" } })).toBeUndefined();
        });
    });

    // ── isOrgAdmin ────────────────────────────────────────────────────────────

    describe("isOrgAdmin", () => {
        test("returns true when user has Admin membership", async () => {
            org_user.findAll.mockResolvedValue([{ role: "Admin" }]);
            expect(await isOrgAdmin(1, 2)).toBe(true);
        });

        test("returns false when user has Editor membership", async () => {
            org_user.findAll.mockResolvedValue([{ role: "Editor" }]);
            expect(await isOrgAdmin(1, 2)).toBe(false);
        });

        test("returns false when user has no membership", async () => {
            org_user.findAll.mockResolvedValue([]);
            expect(await isOrgAdmin(1, 2)).toBe(false);
        });

        test("returns false when userId is null", async () => {
            expect(await isOrgAdmin(null, 2)).toBe(false);
        });

        test("returns false when orgId is undefined", async () => {
            expect(await isOrgAdmin(1, undefined)).toBe(false);
        });
    });

    // ── getOrgRole ────────────────────────────────────────────────────────────

    describe("getOrgRole", () => {
        test("returns the role from the first matching membership", async () => {
            org_user.findAll.mockResolvedValue([{ role: "Editor" }]);
            expect(await getOrgRole(1, 2)).toBe("Editor");
        });

        test("returns undefined when user has no membership", async () => {
            org_user.findAll.mockResolvedValue([]);
            expect(await getOrgRole(1, 2)).toBeUndefined();
        });

        test("returns undefined when userId is null", async () => {
            expect(await getOrgRole(null, 2)).toBeUndefined();
        });

        test("returns undefined when orgId is null", async () => {
            expect(await getOrgRole(1, null)).toBeUndefined();
        });
    });

    // ── requireServerAdmin ────────────────────────────────────────────────────

    describe("requireServerAdmin", () => {
        test("calls next for a genuine server admin", async () => {
            verifyToken.mockReturnValue({ id: 1, is_admin: 1, org_id: 1 });
            user.findAll.mockResolvedValue([makeDbUser({ id: 1, is_admin: 1 })]);
            const req = makeReq(); const res = makeRes(); const next = jest.fn();

            await requireServerAdmin(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.authUser).toBeDefined();
        });

        test("returns 401 when token is missing", async () => {
            verifyToken.mockReturnValue(null);
            const res = makeRes(); const next = jest.fn();

            await requireServerAdmin({ headers: {} }, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
        });

        test("returns 403 when DB marks user as non-admin despite token claim", async () => {
            verifyToken.mockReturnValue({ id: 9, is_admin: 1, org_id: 99 });
            user.findAll.mockResolvedValue([makeDbUser({ is_admin: 0 })]);
            const res = makeRes(); const next = jest.fn();

            await requireServerAdmin(makeReq(), res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith({ message: "Server administrator privileges are required." });
        });

        test("returns 500 when an unexpected error is thrown", async () => {
            verifyToken.mockReturnValue({ id: 1 });
            user.findAll.mockRejectedValue(new Error("DB is down"));
            const res = makeRes(); const next = jest.fn();

            await requireServerAdmin(makeReq(), res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ message: "DB is down" });
        });
    });

    // ── requireCurrentOrgAdminOrServerAdmin ───────────────────────────────────

    describe("requireCurrentOrgAdminOrServerAdmin", () => {
        test("calls next for a server admin", async () => {
            verifyToken.mockReturnValue({ id: 1, is_admin: 1, org_id: 1 });
            user.findAll.mockResolvedValue([makeDbUser({ id: 1, is_admin: 1 })]);
            const req = makeReq(); const res = makeRes(); const next = jest.fn();

            await requireCurrentOrgAdminOrServerAdmin(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        test("calls next for an org Admin", async () => {
            setupAuthUser();
            org_user.findAll.mockResolvedValue([{ role: "Admin" }]);
            const req = makeReq(); const res = makeRes(); const next = jest.fn();

            await requireCurrentOrgAdminOrServerAdmin(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        test("returns 403 for a non-admin user", async () => {
            setupAuthUser();
            org_user.findAll.mockResolvedValue([{ role: "Viewer" }]);
            const res = makeRes(); const next = jest.fn();

            await requireCurrentOrgAdminOrServerAdmin(makeReq(), res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith({ message: "Administrative privileges are required." });
        });

        test("returns 401 when unauthenticated", async () => {
            verifyToken.mockReturnValue(null);
            const res = makeRes(); const next = jest.fn();

            await requireCurrentOrgAdminOrServerAdmin({ headers: {} }, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        test("returns 500 on unexpected error", async () => {
            verifyToken.mockReturnValue({ id: 1 });
            user.findAll.mockRejectedValue(new Error("unexpected"));
            const res = makeRes(); const next = jest.fn();

            await requireCurrentOrgAdminOrServerAdmin(makeReq(), res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ── requireOrgAdminOrServerAdmin ──────────────────────────────────────────

    describe("requireOrgAdminOrServerAdmin", () => {
        const resolveOrgId = (req) => req.body && req.body.org_id;

        test("calls next for a server admin", async () => {
            verifyToken.mockReturnValue({ id: 1, is_admin: 1, org_id: 1 });
            user.findAll.mockResolvedValue([makeDbUser({ id: 1, is_admin: 1 })]);
            const req = { ...makeReq(), body: { org_id: 5 } };
            const res = makeRes(); const next = jest.fn();

            await requireOrgAdminOrServerAdmin(resolveOrgId)(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        test("calls next for an org Admin", async () => {
            setupAuthUser();
            org_user.findAll.mockResolvedValue([{ role: "Admin" }]);
            const req = { ...makeReq(), body: { org_id: 2 } };
            const res = makeRes(); const next = jest.fn();

            await requireOrgAdminOrServerAdmin(resolveOrgId)(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        test("returns 400 when org_id is missing from request", async () => {
            setupAuthUser();
            const req = { ...makeReq(), body: {} };
            const res = makeRes(); const next = jest.fn();

            await requireOrgAdminOrServerAdmin(resolveOrgId)(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({ message: "Organization identifier is required." });
        });

        test("returns 403 when user is not an org admin", async () => {
            setupAuthUser();
            org_user.findAll.mockResolvedValue([{ role: "Editor" }]);
            const req = { ...makeReq(), body: { org_id: 2 } };
            const res = makeRes(); const next = jest.fn();

            await requireOrgAdminOrServerAdmin(resolveOrgId)(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith({
                message: "Administrative privileges are required for the requested organization.",
            });
        });

        test("returns 401 when unauthenticated", async () => {
            verifyToken.mockReturnValue(null);
            const req = { headers: {}, body: { org_id: 2 } };
            const res = makeRes(); const next = jest.fn();

            await requireOrgAdminOrServerAdmin(resolveOrgId)(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        test("returns 500 on unexpected error", async () => {
            verifyToken.mockReturnValue({ id: 1 });
            user.findAll.mockRejectedValue(new Error("boom"));
            const req = { ...makeReq(), body: { org_id: 2 } };
            const res = makeRes(); const next = jest.fn();

            await requireOrgAdminOrServerAdmin(resolveOrgId)(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ── requireSelfOrServerAdmin ──────────────────────────────────────────────

    describe("requireSelfOrServerAdmin", () => {
        const resolveUserId = (req) => req.body && req.body.user_id;

        test("calls next when user accesses their own resource", async () => {
            setupAuthUser({ id: 7 });
            const req = { ...makeReq(), body: { user_id: 7 } };
            const res = makeRes(); const next = jest.fn();

            await requireSelfOrServerAdmin(resolveUserId)(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        test("calls next for a server admin accessing another user's resource", async () => {
            verifyToken.mockReturnValue({ id: 1, is_admin: 1, org_id: 1 });
            user.findAll.mockResolvedValue([makeDbUser({ id: 1, is_admin: 1 })]);
            const req = { ...makeReq(), body: { user_id: 99 } };
            const res = makeRes(); const next = jest.fn();

            await requireSelfOrServerAdmin(resolveUserId)(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        test("returns 400 when user_id is missing", async () => {
            setupAuthUser();
            const req = { ...makeReq(), body: {} };
            const res = makeRes(); const next = jest.fn();

            await requireSelfOrServerAdmin(resolveUserId)(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({ message: "User identifier is required." });
        });

        test("returns 403 when a non-admin user accesses another user's resource", async () => {
            setupAuthUser({ id: 5 });
            const req = { ...makeReq(), body: { user_id: 99 } };
            const res = makeRes(); const next = jest.fn();

            await requireSelfOrServerAdmin(resolveUserId)(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith({
                message: "You are not authorized to access another user's administrative data.",
            });
        });

        test("returns 401 when unauthenticated", async () => {
            verifyToken.mockReturnValue(null);
            const req = { headers: {}, body: { user_id: 5 } };
            const res = makeRes(); const next = jest.fn();

            await requireSelfOrServerAdmin(resolveUserId)(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        test("returns 500 on unexpected error", async () => {
            verifyToken.mockReturnValue({ id: 1 });
            user.findAll.mockRejectedValue(new Error("crash"));
            const req = { ...makeReq(), body: { user_id: 5 } };
            const res = makeRes(); const next = jest.fn();

            await requireSelfOrServerAdmin(resolveUserId)(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ── requireAuthenticated ──────────────────────────────────────────────────

    describe("requireAuthenticated", () => {
        test("calls next for any authenticated user", async () => {
            setupAuthUser();
            const req = makeReq(); const res = makeRes(); const next = jest.fn();

            await requireAuthenticated(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.authUser).toBeDefined();
        });

        test("returns 401 for an unauthenticated request", async () => {
            verifyToken.mockReturnValue(null);
            const res = makeRes(); const next = jest.fn();

            await requireAuthenticated({ headers: {} }, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
        });

        test("returns 500 on unexpected error", async () => {
            verifyToken.mockReturnValue({ id: 1 });
            user.findAll.mockRejectedValue(new Error("db gone"));
            const res = makeRes(); const next = jest.fn();

            await requireAuthenticated(makeReq(), res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ── requireEditorOrAbove ──────────────────────────────────────────────────

    describe("requireEditorOrAbove", () => {
        test("calls next for an Editor", async () => {
            setupAuthUser();
            org_user.findAll.mockResolvedValue([{ role: "Editor" }]);
            const req = makeReq(); const res = makeRes(); const next = jest.fn();

            await requireEditorOrAbove(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        test("calls next for an org Admin", async () => {
            setupAuthUser();
            org_user.findAll.mockResolvedValue([{ role: "Admin" }]);
            const req = makeReq(); const res = makeRes(); const next = jest.fn();

            await requireEditorOrAbove(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        test("calls next for a server admin — does not query org_user", async () => {
            verifyToken.mockReturnValue({ id: 1, is_admin: 1, org_id: 1 });
            user.findAll.mockResolvedValue([makeDbUser({ id: 1, is_admin: 1 })]);
            const req = makeReq(); const res = makeRes(); const next = jest.fn();

            await requireEditorOrAbove(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(org_user.findAll).not.toHaveBeenCalled();
        });

        test("returns 403 for a Viewer", async () => {
            setupAuthUser();
            org_user.findAll.mockResolvedValue([{ role: "Viewer" }]);
            const res = makeRes(); const next = jest.fn();

            await requireEditorOrAbove(makeReq(), res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith({ message: "Editor or Administrator privileges are required." });
        });

        test("returns 403 when user has no org membership", async () => {
            setupAuthUser();
            org_user.findAll.mockResolvedValue([]);
            const res = makeRes(); const next = jest.fn();

            await requireEditorOrAbove(makeReq(), res, next);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        test("returns 401 when unauthenticated", async () => {
            verifyToken.mockReturnValue(null);
            const res = makeRes(); const next = jest.fn();

            await requireEditorOrAbove({ headers: {} }, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        test("returns 500 on unexpected error", async () => {
            verifyToken.mockReturnValue({ id: 1 });
            user.findAll.mockRejectedValue(new Error("fail"));
            const res = makeRes(); const next = jest.fn();

            await requireEditorOrAbove(makeReq(), res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});


// Reusable helpers
const makeDbUser = (overrides = {}) => ({
    id: 9,
    is_admin: 0,
    org_id: 2,
    login: "db-user",
    email: "db-user@example.com",
    name: "DB User",
    ...overrides,
});

const makeReq = () => ({ headers: { authorization: "token" } });
const makeRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn() });

describe("authorization", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ── loadAuthenticatedUser ────────────────────────────────────────────────

    test("loadAuthenticatedUser reloads admin and org fields from the database", async () => {
        verifyToken.mockReturnValue({ id: 9, is_admin: 1, org_id: 99, username: "forged-user" });
        user.findAll.mockResolvedValue([makeDbUser()]);

        const authUser = await loadAuthenticatedUser({ headers: { authorization: "token" } });

        expect(authUser).toMatchObject({
            id: 9,
            is_admin: 0,
            org_id: 2,
            username: "db-user",
            login: "db-user",
            email: "db-user@example.com",
            name: "DB User",
        });
    });

    test("loadAuthenticatedUser returns undefined when token is invalid", async () => {
        verifyToken.mockReturnValue(null);
        const result = await loadAuthenticatedUser({ headers: {} });
        expect(result).toBeUndefined();
    });

    test("loadAuthenticatedUser returns undefined when user is not found in DB", async () => {
        verifyToken.mockReturnValue({ id: 42 });
        user.findAll.mockResolvedValue([]);
        const result = await loadAuthenticatedUser({ headers: { authorization: "token" } });
        expect(result).toBeUndefined();
    });

    // ── getOrgRole ───────────────────────────────────────────────────────────

    test("getOrgRole returns the role from the first matching membership", async () => {
        org_user.findAll.mockResolvedValue([{ role: "Editor" }]);
        const role = await getOrgRole(1, 2);
        expect(role).toBe("Editor");
    });

    test("getOrgRole returns undefined when user has no membership", async () => {
        org_user.findAll.mockResolvedValue([]);
        const role = await getOrgRole(1, 2);
        expect(role).toBeUndefined();
    });

    test("getOrgRole returns undefined when userId is null", async () => {
        const role = await getOrgRole(null, 2);
        expect(role).toBeUndefined();
    });

    test("getOrgRole returns undefined when orgId is null", async () => {
        const role = await getOrgRole(1, null);
        expect(role).toBeUndefined();
    });

    // ── requireServerAdmin ───────────────────────────────────────────────────

    test("requireServerAdmin rejects forged admin claims when the database marks the user as non-admin", async () => {
        verifyToken.mockReturnValue({ id: 9, is_admin: 1, org_id: 99, username: "forged-user" });
        user.findAll.mockResolvedValue([makeDbUser({ is_admin: 0 })]);

        const req = makeReq();
        const res = makeRes();
        const next = jest.fn();

        await requireServerAdmin(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.send).toHaveBeenCalledWith({ message: "Server administrator privileges are required." });
    });

    test("requireServerAdmin calls next for a genuine server admin", async () => {
        verifyToken.mockReturnValue({ id: 1, is_admin: 1, org_id: 1 });
        user.findAll.mockResolvedValue([makeDbUser({ id: 1, is_admin: 1 })]);

        const req = makeReq();
        const res = makeRes();
        const next = jest.fn();

        await requireServerAdmin(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test("requireServerAdmin returns 401 when token is missing", async () => {
        verifyToken.mockReturnValue(null);

        const req = { headers: {} };
        const res = makeRes();
        const next = jest.fn();

        await requireServerAdmin(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });

    // ── requireAuthenticated ─────────────────────────────────────────────────

    test("requireAuthenticated calls next for any authenticated user", async () => {
        verifyToken.mockReturnValue({ id: 9, is_admin: 0, org_id: 2 });
        user.findAll.mockResolvedValue([makeDbUser()]);

        const req = makeReq();
        const res = makeRes();
        const next = jest.fn();

        await requireAuthenticated(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.authUser).toBeDefined();
    });

    test("requireAuthenticated returns 401 for an unauthenticated request", async () => {
        verifyToken.mockReturnValue(null);

        const req = { headers: {} };
        const res = makeRes();
        const next = jest.fn();

        await requireAuthenticated(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });

    // ── requireEditorOrAbove ─────────────────────────────────────────────────

    test("requireEditorOrAbove calls next for an Editor", async () => {
        verifyToken.mockReturnValue({ id: 9, is_admin: 0, org_id: 2 });
        user.findAll.mockResolvedValue([makeDbUser()]);
        org_user.findAll.mockResolvedValue([{ role: "Editor" }]);

        const req = makeReq();
        const res = makeRes();
        const next = jest.fn();

        await requireEditorOrAbove(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test("requireEditorOrAbove calls next for an org Admin", async () => {
        verifyToken.mockReturnValue({ id: 9, is_admin: 0, org_id: 2 });
        user.findAll.mockResolvedValue([makeDbUser()]);
        org_user.findAll.mockResolvedValue([{ role: "Admin" }]);

        const req = makeReq();
        const res = makeRes();
        const next = jest.fn();

        await requireEditorOrAbove(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test("requireEditorOrAbove calls next for a server admin regardless of org role", async () => {
        verifyToken.mockReturnValue({ id: 1, is_admin: 1, org_id: 2 });
        user.findAll.mockResolvedValue([makeDbUser({ id: 1, is_admin: 1 })]);

        const req = makeReq();
        const res = makeRes();
        const next = jest.fn();

        await requireEditorOrAbove(req, res, next);

        expect(next).toHaveBeenCalled();
        // org_user should not even be queried for server admins
        expect(org_user.findAll).not.toHaveBeenCalled();
    });

    test("requireEditorOrAbove returns 403 for a Viewer", async () => {
        verifyToken.mockReturnValue({ id: 9, is_admin: 0, org_id: 2 });
        user.findAll.mockResolvedValue([makeDbUser()]);
        org_user.findAll.mockResolvedValue([{ role: "Viewer" }]);

        const req = makeReq();
        const res = makeRes();
        const next = jest.fn();

        await requireEditorOrAbove(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.send).toHaveBeenCalledWith({ message: "Editor or Administrator privileges are required." });
    });

    test("requireEditorOrAbove returns 403 when user has no org membership", async () => {
        verifyToken.mockReturnValue({ id: 9, is_admin: 0, org_id: 2 });
        user.findAll.mockResolvedValue([makeDbUser()]);
        org_user.findAll.mockResolvedValue([]);

        const req = makeReq();
        const res = makeRes();
        const next = jest.fn();

        await requireEditorOrAbove(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test("requireEditorOrAbove returns 401 when token is missing", async () => {
        verifyToken.mockReturnValue(null);

        const req = { headers: {} };
        const res = makeRes();
        const next = jest.fn();

        await requireEditorOrAbove(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });
});
