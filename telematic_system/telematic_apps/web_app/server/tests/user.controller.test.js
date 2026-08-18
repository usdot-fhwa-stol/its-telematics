// Mock the Sequelize models module to avoid real MySQL connections during tests.
jest.mock("../models", () => {
    const user = { findAll: jest.fn(), update: jest.fn() };
    const org_user = { findAll: jest.fn() };
    return { user, org_user };
});

const { user, org_user } = require("../models");
const manager = require('htpasswd-mgr');
const user_controller = require('../controllers/user.controller')
const saltHash = require('password-salt-and-hash')
let grafana_htpasswd = '/opt/apache2/grafana_htpasswd';
let htpasswordManager = manager(grafana_htpasswd)

process.env.SECRET = "my test secret";

describe("loginUser", () => {
    test("Should login", async () => {
        let users = [{
            username: "test",
            id: 1,
            last_seen_at: 12233333,
            email: 'test@email.com',
            name: 'test',
            session_token: '###############',
            org_id: 1,
            is_admin: 1,
            login: 'test',
            password: 'test',
            salt: ''
        }];
        let hashPassword = saltHash.generateSaltHash(users[0].password);
        users[0].password = hashPassword.password;
        users[0].salt = hashPassword.salt;
        jest.spyOn(user, 'findAll').mockResolvedValueOnce(users);
        jest.spyOn(htpasswordManager, 'upsertUser').mockImplementation((arg1, arg2) => Promise.resolve({data: 'data'}));

        let mReq = { body: { password: 'test', username: 'test' }, session: { token: '' } };
        let mRes = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        let mNext = jest.fn();
        await user_controller.loginUser(mReq, mRes);

    });
})

describe("registerUser", () => {
    test("Should reject restricted administrative fields during registration", async () => {
        let mReq = {
            body: {
                username: "test-user",
                email: "test@example.com",
                password: "StrongPassword123!",
                org_id: 1,
                is_admin: 1,
            }
        };
        let mRes = { status: jest.fn().mockReturnThis(), send: jest.fn() };

        await user_controller.registerUser(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.send).toHaveBeenCalledWith({
            message: "Request cannot include restricted administrative fields: is_admin."
        });
    });
});

describe("updateUserServerAdmin", () => {
    test("Should reject unexpected fields in admin update payload", async () => {
        let mReq = {
            body: {
                user_id: 1,
                is_admin: 1,
                role: "Admin",
            }
        };
        let mRes = { status: jest.fn().mockReturnThis(), send: jest.fn() };

        await user_controller.updateUserServerAdmin(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.send).toHaveBeenCalledWith({
            message: "Unexpected update fields: role."
        });
    });

    describe("getCurrentUserAccess", () => {
        test("Should return current user access from server-side auth user and org role", async () => {
            jest.spyOn(org_user, 'findAll').mockResolvedValueOnce([{ role: "Admin" }]);

            let mReq = {
                authUser: {
                    id: 1,
                    org_id: 2,
                    is_admin: 0
                }
            };
            let mRes = { status: jest.fn().mockReturnThis(), send: jest.fn() };

            await user_controller.getCurrentUserAccess(mReq, mRes);

            expect(mRes.status).toHaveBeenCalledWith(200);
            expect(mRes.send).toHaveBeenCalledWith({
                user_id: 1,
                org_id: 2,
                role: "Admin",
                is_admin: "no",
                can_access_user_list: true
            });
        });
    });

    test("Should reject invalid is_admin values", async () => {
        let mReq = {
            body: {
                user_id: 1,
                is_admin: 2,
            }
        };
        let mRes = { status: jest.fn().mockReturnThis(), send: jest.fn() };

        await user_controller.updateUserServerAdmin(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.send).toHaveBeenCalledWith({
            message: "is_admin must be either 0 or 1."
        });
    });
});
