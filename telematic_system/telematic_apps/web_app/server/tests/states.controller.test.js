/*
 * Copyright (C) 2019-2024 LEIDOS.
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
jest.mock("../models", () => ({
    states: { findAll: jest.fn() },
    Sequelize: { Op: {} }
}));

const { states } = require("../models");
const statesController = require("../controllers/states.controller");
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

describe("states.controller", () => {
    beforeEach(() => jest.clearAllMocks());

    describe("findAll", () => {
        it("returns 200 with data on success", async () => {
            const data = [{ id: 1, name: "Virginia" }];
            states.findAll.mockResolvedValue(data);
            const req = {};
            const res = mockRes();
            statesController.findAll(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(data);
        });

        it("returns 500 on DB error", async () => {
            states.findAll.mockRejectedValue(new Error("DB error"));
            const req = {};
            const res = mockRes();
            statesController.findAll(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ message: "DB error" });
        });

        it("returns 500 with default message when error has no message", async () => {
            states.findAll.mockRejectedValue({});
            const req = {};
            const res = mockRes();
            statesController.findAll(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ message: "Error while findAll states." });
        });
    });
});
