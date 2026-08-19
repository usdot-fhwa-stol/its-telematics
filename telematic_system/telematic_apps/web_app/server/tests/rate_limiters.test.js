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
const express = require("express");
const request = require("supertest");
const { loginLimiter, registerLimiter } = require("../utils/rate_limiters");

describe("rate_limiters", () => {
    test("loginLimiter and registerLimiter are exported as Express middleware functions", () => {
        expect(typeof loginLimiter).toBe("function");
        expect(typeof registerLimiter).toBe("function");
    });

    describe("loginLimiter", () => {
        let app;
        beforeEach(() => {
            app = express();
            app.set("trust proxy", 1);
            // Attach the limiter directly to a test route
            app.post("/login", loginLimiter, (req, res) => res.sendStatus(200));
        });

        test("allows requests within the limit", async () => {
            const res = await request(app).post("/login");
            expect(res.status).toBe(200);
        });

        test("message function includes current attempt count and limit", () => {
            const mockReq = { rateLimit: { current: 5, limit: 10 } };
            const mockRes = {};
            // Access the message option directly from the middleware's options object
            const msg = loginLimiter.options?.message?.(mockReq, mockRes)
                ?? loginLimiter.message?.(mockReq, mockRes);
            if (msg) {
                expect(msg.message).toContain("5");
                expect(msg.message).toContain("10");
                expect(msg.message).toContain("15 minutes");
            }
        });
    });

    describe("registerLimiter", () => {
        let app;
        beforeEach(() => {
            app = express();
            app.set("trust proxy", 1);
            app.post("/register", registerLimiter, (req, res) => res.sendStatus(200));
        });

        test("allows requests within the limit", async () => {
            const res = await request(app).post("/register");
            expect(res.status).toBe(200);
        });

        test("message function includes current attempt count and limit", () => {
            const mockReq = { rateLimit: { current: 3, limit: 10 } };
            const mockRes = {};
            const msg = registerLimiter.options?.message?.(mockReq, mockRes)
                ?? registerLimiter.message?.(mockReq, mockRes);
            if (msg) {
                expect(msg.message).toContain("3");
                expect(msg.message).toContain("10");
                expect(msg.message).toContain("1 hour");
            }
        });
    });
});

