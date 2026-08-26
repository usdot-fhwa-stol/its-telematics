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
const { validatePassword, MIN_PASSWORD_LENGTH, MIN_ZXCVBN_SCORE } = require("../utils/password_policy");

describe("validatePassword", () => {
    test("exports constants with expected values", () => {
        expect(MIN_PASSWORD_LENGTH).toBe(12);
        expect(MIN_ZXCVBN_SCORE).toBe(3);
    });

    test("rejects undefined password", () => {
        const result = validatePassword(undefined, "user", "user@example.com");
        expect(result.valid).toBe(false);
        expect(result.message).toBe("Password is required.");
    });

    test("rejects null password", () => {
        const result = validatePassword(null, "user", "user@example.com");
        expect(result.valid).toBe(false);
        expect(result.message).toBe("Password is required.");
    });

    test("rejects non-string password", () => {
        const result = validatePassword(12345678901234, "user", "user@example.com");
        expect(result.valid).toBe(false);
        expect(result.message).toBe("Password is required.");
    });

    test("rejects password shorter than minimum length", () => {
        const result = validatePassword("Short1!", "user", "user@example.com");
        expect(result.valid).toBe(false);
        expect(result.message).toContain(`${MIN_PASSWORD_LENGTH} characters`);
    });

    test("rejects password equal to username (case-insensitive)", () => {
        const result = validatePassword("myusername123456", "myusername123456", "other@example.com");
        expect(result.valid).toBe(false);
        expect(result.message).toBe("Password cannot be the same as the username.");
    });

    test("rejects password equal to email (case-insensitive)", () => {
        const result = validatePassword("user@example.com", "otherusername", "user@example.com");
        expect(result.valid).toBe(false);
        expect(result.message).toBe("Password cannot be the same as the email.");
    });

    test("rejects weak password that passes length but fails zxcvbn", () => {
        // "aaaaaaaaaaaaaaa" is long but extremely weak (score 0)
        const result = validatePassword("aaaaaaaaaaaaaaa", "someuser", "someuser@example.com");
        expect(result.valid).toBe(false);
    });

    test("accepts a strong password", () => {
        // A deliberately strong password unlikely to appear in any dictionary
        const result = validatePassword("C0rr3ct-H0rse-Batt3ry-Staple!", "someuser", "someuser@example.com");
        expect(result.valid).toBe(true);
        expect(result.message).toBeUndefined();
    });

    test("accepts a strong password when username and email are undefined", () => {
        const result = validatePassword("C0rr3ct-H0rse-Batt3ry-Staple!", undefined, undefined);
        expect(result.valid).toBe(true);
    });

    test("accepts a strong password when username and email are null", () => {
        const result = validatePassword("C0rr3ct-H0rse-Batt3ry-Staple!", null, null);
        expect(result.valid).toBe(true);
    });
});
