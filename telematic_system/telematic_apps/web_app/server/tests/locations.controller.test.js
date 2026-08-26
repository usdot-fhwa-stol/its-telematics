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
    locations: { create: jest.fn(), findAll: jest.fn() },
    states: {},
    Sequelize: { Op: {} }
}));

const { locations } = require("../models");
const locationsController = require("../controllers/locations.controller");
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

describe("locations.controller", () => {
    beforeEach(() => jest.clearAllMocks());

    describe("create", () => {
        it("returns 400 when facility_name is missing", () => {
            const req = { body: {} };
            const res = mockRes();
            locationsController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({ message: "Content cannot be empty." });
        });

        it("returns 201 with created location on success", async () => {
            const newLocation = { id: 1, facility_name: "Test Lab" };
            locations.create.mockResolvedValue(newLocation);
            const req = { body: { facility_name: "Test Lab", city: "McLean" } };
            const res = mockRes();
            locationsController.create(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith(newLocation);
        });

        it("returns 500 on DB error during create", async () => {
            locations.create.mockRejectedValue(new Error("Insert failed"));
            const req = { body: { facility_name: "Test Lab" } };
            const res = mockRes();
            locationsController.create(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ message: "Insert failed" });
        });

        it("returns 500 with default message when error has no message", async () => {
            locations.create.mockRejectedValue({});
            const req = { body: { facility_name: "Test Lab" } };
            const res = mockRes();
            locationsController.create(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ message: "Error while creating location." });
        });
    });

    describe("findAll", () => {
        it("returns 200 with data on success", async () => {
            const data = [{ id: 1, facility_name: "Test Lab" }];
            locations.findAll.mockResolvedValue(data);
            const req = {};
            const res = mockRes();
            locationsController.findAll(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(data);
        });

        it("returns 500 on DB error during findAll", async () => {
            locations.findAll.mockRejectedValue(new Error("Query failed"));
            const req = {};
            const res = mockRes();
            locationsController.findAll(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ message: "Query failed" });
        });

        it("returns 500 with default message when findAll error has no message", async () => {
            locations.findAll.mockRejectedValue({});
            const req = {};
            const res = mockRes();
            locationsController.findAll(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ message: "Error while findAll locations." });
        });
    });
});
