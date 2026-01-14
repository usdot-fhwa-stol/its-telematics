// Mock the Sequelize models module to avoid real MySQL connections during tests.
jest.mock("../models", () => {
    const user = { findAll: jest.fn() };
    return { user };
});

const { user } = require("../models");
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
