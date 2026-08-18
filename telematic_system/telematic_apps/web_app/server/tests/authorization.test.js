jest.mock("../models", () => ({
    user: { findAll: jest.fn() },
    org_user: { findAll: jest.fn() },
}));

jest.mock("../utils/verify_token", () => ({
    verifyToken: jest.fn(),
}));

const { user } = require("../models");
const { verifyToken } = require("../utils/verify_token");
const {
    loadAuthenticatedUser,
    requireServerAdmin,
} = require("../utils/authorization");

describe("authorization", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("loadAuthenticatedUser reloads admin and org fields from the database", async () => {
        verifyToken.mockReturnValue({
            id: 9,
            is_admin: 1,
            org_id: 99,
            username: "forged-user",
        });
        user.findAll.mockResolvedValue([{
            id: 9,
            is_admin: 0,
            org_id: 2,
            login: "db-user",
            email: "db-user@example.com",
            name: "DB User",
        }]);

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

    test("requireServerAdmin rejects forged admin claims when the database marks the user as non-admin", async () => {
        verifyToken.mockReturnValue({
            id: 9,
            is_admin: 1,
            org_id: 99,
            username: "forged-user",
        });
        user.findAll.mockResolvedValue([{
            id: 9,
            is_admin: 0,
            org_id: 2,
            login: "db-user",
            email: "db-user@example.com",
            name: "DB User",
        }]);

        const req = { headers: { authorization: "token" } };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        const next = jest.fn();

        await requireServerAdmin(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.send).toHaveBeenCalledWith({
            message: "Server administrator privileges are required.",
        });
    });
});
