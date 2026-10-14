const request = require("supertest");
const app = require("../app");
const jwt = require("jsonwebtoken");
require("dotenv").config();

process.env.SECRET = "my test secret";

const generateToken = () => {
    let result = {
        id: 1,
        last_seen_at: 1000,
        is_admin: 1,
        email: "test",
        name: "test",
        org_id: 1,
        login: "test",
        username: "test",
    }
  return jwt.sign(result, process.env.SECRET, { expiresIn: "1h" });
};

describe("GET /api/org/all", () => {
  it("connect ECONNREFUSED ", async () => {
    const res = await request(app).get("/api/org/all");
    expect(res.statusCode).toBe(500);
  });
});

describe("POST /api/users/forget/password", () => {
    it("/api/users/forget/password ", async () => {
      const res = await request(app).get("/api/users/forget/password");
      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /api/users/register", () => {
    it("/api/users/register ", async () => {
      const res = await request(app).post("/api/users/register");
      expect(res.statusCode).toBe(400);
    });
  });

describe("POST /api/users/login", () => {
  it("Session expired", async () => {
    const res = await request(app).post("/api/users/login");
    expect(res.statusCode).toBe(400);
  });
});

describe("GET /api/users/ping", () => {
  it("Ping server", async () => {
    let token = generateToken();
    const res = await request(app)
      .get("/api/users/ping")
      .set({ Authorization: token });
    expect(res.statusCode).toBe(200);
  });
});

describe("POST /update/server/admin", () => {
    it("/update/server/admin", async () => {
      let token = generateToken();
      const res = await request(app)
        .post("/update/server/admin")
        .set({ Authorization: token });
      expect(res.statusCode).toBe(404);
    });

    it("/update/server/admin no token", async () => {
        const res = await request(app)
          .post("/update/server/admin");
        expect(res.statusCode).toBe(401);
      });
  });
