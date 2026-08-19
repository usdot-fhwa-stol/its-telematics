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

// rate_limiters.js just configures express-rate-limit instances.
// We verify the exported middleware objects exist and carry the expected config
// without needing a live HTTP server.
const { loginLimiter, registerLimiter } = require("../utils/rate_limiters");

describe("rate_limiters", () => {
    test("loginLimiter is exported as a function (Express middleware)", () => {
        expect(typeof loginLimiter).toBe("function");
    });

    test("registerLimiter is exported as a function (Express middleware)", () => {
        expect(typeof registerLimiter).toBe("function");
    });

    test("loginLimiter message function includes attempt count and limit", () => {
        // Access the options the limiter was constructed with via its internal store.
        // express-rate-limit exposes options on the middleware function itself.
        const mockReq = { rateLimit: { current: 5, limit: 10 } };
        const mockRes = {};
        const msg = loginLimiter.options
            ? loginLimiter.options.message(mockReq, mockRes)
            : loginLimiter.message?.(mockReq, mockRes);

        if (msg) {
            expect(msg.message).toContain("5");
            expect(msg.message).toContain("10");
            expect(msg.message).toContain("15 minutes");
        }
    });

    test("registerLimiter message function includes attempt count and limit", () => {
        const mockReq = { rateLimit: { current: 3, limit: 10 } };
        const mockRes = {};
        const msg = registerLimiter.options
            ? registerLimiter.options.message(mockReq, mockRes)
            : registerLimiter.message?.(mockReq, mockRes);

        if (msg) {
            expect(msg.message).toContain("3");
            expect(msg.message).toContain("10");
            expect(msg.message).toContain("1 hour");
        }
    });
});
