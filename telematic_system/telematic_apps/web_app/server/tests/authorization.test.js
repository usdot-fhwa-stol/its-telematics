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
    loadAuthenticatedUser,
    requireAuthenticated,
    requireEditorOrAbove,
    requireServerAdmin,
} = require("../utils/authorization");

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
