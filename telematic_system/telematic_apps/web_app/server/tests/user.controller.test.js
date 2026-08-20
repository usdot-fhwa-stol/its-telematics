// Mock the Sequelize models module to avoid real MySQL connections during tests.
jest.mock("../models", () => {
    const user = { findAll: jest.fn(), update: jest.fn(), create: jest.fn() };
    const org_user = { findAll: jest.fn(), create: jest.fn() };
    const org = { findAll: jest.fn() };
    return { user, org_user, org };
});

jest.mock("../utils/verify_token", () => ({ verifyToken: jest.fn() }));

const { user, org_user, org } = require("../models");
const { verifyToken } = require("../utils/verify_token");
const manager = require('htpasswd-mgr');
const user_controller = require('../controllers/user.controller');
const saltHash = require('password-salt-and-hash');
let grafana_htpasswd = '/opt/apache2/grafana_htpasswd';
let htpasswordManager = manager(grafana_htpasswd);

process.env.SECRET = "my test secret";

const makeRes = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn(), sendStatus: jest.fn() });

beforeEach(() => jest.clearAllMocks());

// ── loginUser ─────────────────────────────────────────────────────────────────

describe("loginUser", () => {
    test("returns 400 when body is missing", async () => {
        const res = makeRes();
        await user_controller.loginUser({ body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("returns 401 when user is not found", async () => {
        user.findAll.mockResolvedValue([]);
        const res = makeRes();
        await user_controller.loginUser({ body: { username: "nobody", password: "pass" } }, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test("returns 401 when password does not match", async () => {
        const hashPassword = saltHash.generateSaltHash("correct");
        user.findAll.mockResolvedValue([{
            id: 1, login: "alice", email: "a@a.com", is_admin: 0, org_id: 1,
            password: hashPassword.password, salt: hashPassword.salt,
        }]);
        const res = makeRes();
        await user_controller.loginUser({ body: { username: "alice", password: "wrong" } }, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test("returns 200 and token on successful login", async () => {
        const hashPassword = saltHash.generateSaltHash("test");
        user.findAll.mockResolvedValue([{
            id: 1, login: "test", email: "test@email.com", name: "test",
            last_seen_at: 0, is_admin: 1, org_id: 1,
            password: hashPassword.password, salt: hashPassword.salt,
        }]);
        jest.spyOn(htpasswordManager, 'upsertUser').mockResolvedValue({ data: 'data' });
        org.findAll.mockResolvedValue([{ id: 1, name: "Test Org" }]);
        const res = makeRes();
        await user_controller.loginUser({ body: { password: 'test', username: 'test' } }, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("returns 500 when htpasswd upsert fails", async () => {
        const hashPassword = saltHash.generateSaltHash("test");
        user.findAll.mockResolvedValue([{
            id: 1, login: "test", email: "a@a.com", name: "t",
            last_seen_at: 0, is_admin: 0, org_id: 1,
            password: hashPassword.password, salt: hashPassword.salt,
        }]);
        jest.spyOn(htpasswordManager, 'upsertUser').mockRejectedValue(new Error("htpasswd error"));
        const res = makeRes();
        await user_controller.loginUser({ body: { password: 'test', username: 'test' } }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    test("returns 500 on DB error", async () => {
        user.findAll.mockRejectedValue(new Error("DB down"));
        const res = makeRes();
        await user_controller.loginUser({ body: { username: "u", password: "p" } }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ── registerUser ──────────────────────────────────────────────────────────────

describe("registerUser", () => {
    const STRONG_PASSWORD = "C0rr3ct-H0rse-Batt3ry-Staple!";

    test("returns 400 when body is missing required fields", async () => {
        const res = makeRes();
        await user_controller.registerUser({ body: { username: "u" } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("rejects restricted administrative fields (is_admin)", async () => {
        const res = makeRes();
        await user_controller.registerUser({
            body: { username: "u", email: "u@x.com", password: STRONG_PASSWORD, org_id: 1, is_admin: 1 }
        }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            message: "Request cannot include restricted administrative fields: is_admin."
        });
    });

    test("rejects a weak password", async () => {
        const res = makeRes();
        await user_controller.registerUser({
            body: { username: "testuser", email: "u@x.com", password: "aaaaaaaaaaaaaaa", org_id: 1 }
        }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("returns 404 when username or email already exists", async () => {
        user.findAll.mockResolvedValue([{ id: 1, login: "u" }]);
        const res = makeRes();
        await user_controller.registerUser({
            body: { username: "u", email: "u@x.com", password: STRONG_PASSWORD, org_id: 1 }
        }, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({ message: "Username or email already exist." });
    });

    test("returns 201 on successful registration", async () => {
        user.findAll.mockResolvedValue([]);
        user.create.mockResolvedValue({ id: 5, org_id: 1 });
        org_user.create.mockResolvedValue({});
        const res = makeRes();
        await user_controller.registerUser({
            body: { username: "newuser", email: "new@x.com", password: STRONG_PASSWORD, org_id: 1 }
        }, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith({ message: "Successfully registered user." });
    });

    test("returns 500 when user.create fails", async () => {
        user.findAll.mockResolvedValue([]);
        user.create.mockRejectedValue(new Error("create failed"));
        const res = makeRes();
        await user_controller.registerUser({
            body: { username: "newuser", email: "new@x.com", password: STRONG_PASSWORD, org_id: 1 }
        }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    test("returns 500 when org_user.create fails", async () => {
        user.findAll.mockResolvedValue([]);
        user.create.mockResolvedValue({ id: 5, org_id: 1 });
        org_user.create.mockRejectedValue(new Error("org create failed"));
        const res = makeRes();
        await user_controller.registerUser({
            body: { username: "newuser", email: "new@x.com", password: STRONG_PASSWORD, org_id: 1 }
        }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    test("returns 404 when user.findAll throws", async () => {
        user.findAll.mockRejectedValue(new Error("DB error"));
        const res = makeRes();
        await user_controller.registerUser({
            body: { username: "u", email: "u@x.com", password: STRONG_PASSWORD, org_id: 1 }
        }, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

// ── forgetPwd ─────────────────────────────────────────────────────────────────

describe("forgetPwd", () => {
    const STRONG_PASSWORD = "C0rr3ct-H0rse-Batt3ry-Staple!";

    test("returns 400 when body is missing fields", async () => {
        const res = makeRes();
        await user_controller.forgetPwd({ body: { username: "u" } }, res);
        expect(res.sendStatus).toHaveBeenCalledWith(400);
    });

    test("rejects restricted fields in body", async () => {
        const res = makeRes();
        await user_controller.forgetPwd({
            body: { username: "u", email: "u@x.com", new_password: STRONG_PASSWORD, is_admin: 1 }
        }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining("is_admin") })
        );
    });

    test("rejects weak new_password", async () => {
        const res = makeRes();
        await user_controller.forgetPwd({
            body: { username: "testuser", email: "u@x.com", new_password: "aaaaaaaaaaaaaaa" }
        }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("returns 400 when user is not found", async () => {
        user.findAll.mockResolvedValue([]);
        const res = makeRes();
        await user_controller.forgetPwd({
            body: { username: "nobody", email: "no@x.com", new_password: STRONG_PASSWORD }
        }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("returns 200 on successful password update", async () => {
        user.findAll.mockResolvedValue([{ id: 1 }]);
        user.update.mockResolvedValue([1]);
        jest.spyOn(htpasswordManager, 'upsertUser').mockResolvedValue({});
        const res = makeRes();
        await user_controller.forgetPwd({
            body: { username: "alice", email: "a@x.com", new_password: STRONG_PASSWORD }
        }, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("returns 500 when user.update returns 0 rows", async () => {
        user.findAll.mockResolvedValue([{ id: 1 }]);
        user.update.mockResolvedValue([0]);
        const res = makeRes();
        await user_controller.forgetPwd({
            body: { username: "alice", email: "a@x.com", new_password: STRONG_PASSWORD }
        }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    test("returns 500 when htpasswd upsert fails", async () => {
        user.findAll.mockResolvedValue([{ id: 1 }]);
        user.update.mockResolvedValue([1]);
        jest.spyOn(htpasswordManager, 'upsertUser').mockRejectedValue(new Error("htpasswd fail"));
        const res = makeRes();
        await user_controller.forgetPwd({
            body: { username: "alice", email: "a@x.com", new_password: STRONG_PASSWORD }
        }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    test("returns 500 on DB error", async () => {
        user.findAll.mockRejectedValue(new Error("DB down"));
        const res = makeRes();
        await user_controller.forgetPwd({
            body: { username: "u", email: "u@x.com", new_password: STRONG_PASSWORD }
        }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ── updateUserServerAdmin ─────────────────────────────────────────────────────

describe("updateUserServerAdmin", () => {
    test("returns 400 when body is missing", async () => {
        const res = makeRes();
        await user_controller.updateUserServerAdmin({ body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("rejects unexpected fields", async () => {
        const res = makeRes();
        await user_controller.updateUserServerAdmin({ body: { user_id: 1, is_admin: 1, role: "Admin" } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Unexpected update fields: role." });
    });

    test("rejects invalid is_admin value", async () => {
        const res = makeRes();
        await user_controller.updateUserServerAdmin({ body: { user_id: 1, is_admin: 2 } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "is_admin must be either 0 or 1." });
    });

    test("returns 200 on successful update", async () => {
        user.update.mockResolvedValue([1]);
        const res = makeRes();
        await user_controller.updateUserServerAdmin({ body: { user_id: 1, is_admin: 1 } }, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("returns 400 when no rows are updated", async () => {
        user.update.mockResolvedValue([0]);
        const res = makeRes();
        await user_controller.updateUserServerAdmin({ body: { user_id: 99, is_admin: 0 } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("returns 500 on DB error", async () => {
        user.update.mockRejectedValue(new Error("DB fail"));
        const res = makeRes();
        await user_controller.updateUserServerAdmin({ body: { user_id: 1, is_admin: 1 } }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ── getCurrentUserAccess ──────────────────────────────────────────────────────

describe("getCurrentUserAccess", () => {
    test("returns access info for a server admin", async () => {
        org_user.findAll.mockResolvedValue([{ role: "Admin" }]);
        const res = makeRes();
        await user_controller.getCurrentUserAccess({
            authUser: { id: 1, org_id: 1, is_admin: 1 }
        }, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            is_admin: "yes",
            can_access_user_list: true
        }));
    });

    test("returns access info for an org Admin (can_access_user_list=true)", async () => {
        org_user.findAll.mockResolvedValue([{ role: "Admin" }]);
        const res = makeRes();
        await user_controller.getCurrentUserAccess({
            authUser: { id: 1, org_id: 2, is_admin: 0 }
        }, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            role: "Admin",
            is_admin: "no",
            can_access_user_list: true
        }));
    });

    test("returns access info for a Viewer (can_access_user_list=false)", async () => {
        org_user.findAll.mockResolvedValue([{ role: "Viewer" }]);
        const res = makeRes();
        await user_controller.getCurrentUserAccess({
            authUser: { id: 2, org_id: 2, is_admin: 0 }
        }, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            role: "Viewer",
            can_access_user_list: false
        }));
    });

    test("returns 401 when no auth user and token is invalid", async () => {
        verifyToken.mockReturnValue(null);
        const res = makeRes();
        await user_controller.getCurrentUserAccess({ headers: {} }, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test("returns 500 on unexpected error", async () => {
        org_user.findAll.mockRejectedValue(new Error("DB fail"));
        const res = makeRes();
        await user_controller.getCurrentUserAccess({
            authUser: { id: 1, org_id: 1, is_admin: 0 }
        }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ── deleteUser ────────────────────────────────────────────────────────────────

describe("deleteUser", () => {
    test("returns 400 when query.username is missing", async () => {
        const res = makeRes();
        await user_controller.deleteUser({ query: {} }, res);
        expect(res.sendStatus).toHaveBeenCalledWith(400);
    });

    test("returns 200 on successful delete", async () => {
        jest.spyOn(htpasswordManager, 'removeUser').mockResolvedValue({});
        const res = makeRes();
        await user_controller.deleteUser({ query: { username: "alice" } }, res);
        expect(res.sendStatus).toHaveBeenCalledWith(200);
    });

    test("returns 501 when removeUser fails", async () => {
        jest.spyOn(htpasswordManager, 'removeUser').mockRejectedValue(new Error("fail"));
        const res = makeRes();
        await user_controller.deleteUser({ query: { username: "alice" } }, res);
        expect(res.sendStatus).toHaveBeenCalledWith(501);
    });
});

// ── findAll ───────────────────────────────────────────────────────────────────

describe("findAll", () => {
    test("returns 401 when no auth user and token is invalid", async () => {
        verifyToken.mockReturnValue(null);
        const res = makeRes();
        await user_controller.findAll({ headers: {} }, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test("returns all users for a server admin", async () => {
        // First call: findAll users list
        user.findAll.mockResolvedValueOnce([
            { id: 1, login: "a", email: "a@x.com", is_admin: 1, org_id: 1, last_seen_at: 0 }
        ]);
        const res = makeRes();
        await user_controller.findAll({
            authUser: { id: 1, is_admin: 1, org_id: 1 }
        }, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith([
            expect.objectContaining({ login: "a", is_admin: "yes" })
        ]);
    });

    test("scopes query to current org for an org admin", async () => {
        // First call: isOrgAdmin check, second: filtered user list
        org_user.findAll.mockResolvedValueOnce([{ role: "Admin" }]);
        user.findAll.mockResolvedValueOnce([
            { id: 2, login: "b", email: "b@x.com", is_admin: 0, org_id: 5, last_seen_at: 0 }
        ]);
        const res = makeRes();
        await user_controller.findAll({
            authUser: { id: 2, is_admin: 0, org_id: 5 }
        }, res);
        expect(user.findAll).toHaveBeenCalledWith({ where: { org_id: 5 } });
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("returns 403 for a non-admin user", async () => {
        org_user.findAll.mockResolvedValueOnce([{ role: "Editor" }]);
        const res = makeRes();
        await user_controller.findAll({
            authUser: { id: 3, is_admin: 0, org_id: 5 }
        }, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test("returns 500 on DB error in user list query", async () => {
        org_user.findAll.mockResolvedValueOnce([{ role: "Admin" }]);
        user.findAll.mockRejectedValue(new Error("DB fail"));
        const res = makeRes();
        await user_controller.findAll({
            authUser: { id: 2, is_admin: 0, org_id: 5 }
        }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
