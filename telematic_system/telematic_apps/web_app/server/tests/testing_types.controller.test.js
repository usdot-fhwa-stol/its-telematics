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
    testing_types: { findAll: jest.fn() },
    Sequelize: { Op: {} }
}));

const { testing_types } = require("../models");
const testingTypesController = require("../controllers/testing_types.controller");
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

describe("testing_types.controller", () => {
    beforeEach(() => jest.clearAllMocks());

    describe("findAll", () => {
        it("returns 200 with data on success", async () => {
            const data = [{ id: 1, name: "Proof of Concept" }];
            testing_types.findAll.mockResolvedValue(data);
            const req = {};
            const res = mockRes();
            testingTypesController.findAll(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(data);
        });

        it("returns 500 on DB error", async () => {
            testing_types.findAll.mockRejectedValue(new Error("DB error"));
            const req = {};
            const res = mockRes();
            testingTypesController.findAll(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ message: "DB error" });
        });

        it("returns 500 with default message when error has no message", async () => {
            testing_types.findAll.mockRejectedValue({});
            const req = {};
            const res = mockRes();
            testingTypesController.findAll(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ message: "Error while findAll testing_types." });
        });
    });
});
