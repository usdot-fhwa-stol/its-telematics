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
jest.mock("../models", () => {
    const Op = { like: Symbol("like"), gt: Symbol("gt"), lt: Symbol("lt") };
    return {
        events: { create: jest.fn(), findAll: jest.fn(), update: jest.fn(), destroy: jest.fn() },
        locations: {},
        testing_types: {},
        units: {},
        event_units: {},
        Sequelize: { Op, literal: jest.fn(val => val) }
    };
});

const { events } = require("../models");
const eventsController = require("../controllers/events.controller");
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

describe("events.controller", () => {
    beforeEach(() => jest.clearAllMocks());

    describe("create", () => {
        it("returns 400 when name is missing", () => {
            const req = { body: {} };
            const res = mockRes();
            eventsController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("returns 201 with created event on success", async () => {
            const newEvent = { id: 1, name: "Test Event" };
            events.create.mockResolvedValue(newEvent);
            const req = { body: { name: "Test Event", start_at: "2024-01-01", end_at: "2024-01-02" } };
            const res = mockRes();
            eventsController.create(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith(newEvent);
        });

        it("returns 500 on DB error during create", async () => {
            events.create.mockRejectedValue(new Error("Insert failed"));
            const req = { body: { name: "Test Event", start_at: "2024-01-01", end_at: "2024-01-02" } };
            const res = mockRes();
            eventsController.create(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ message: "Insert failed" });
        });

        it("returns 500 with default message when create error has no message", async () => {
            events.create.mockRejectedValue({});
            const req = { body: { name: "Test Event", start_at: "2024-01-01", end_at: "2024-01-02" } };
            const res = mockRes();
            eventsController.create(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ message: "Error while creating event." });
        });
    });

    describe("findAll", () => {
        it("returns 200 with events on success (no filters)", async () => {
            const data = [{ id: 1, name: "Test Event" }];
            events.findAll.mockResolvedValue(data);
            const req = { query: {} };
            const res = mockRes();
            eventsController.findAll(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(data);
        });

        it("applies name filter", async () => {
            events.findAll.mockResolvedValue([]);
            const req = { query: { name: "Sprint" } };
            const res = mockRes();
            eventsController.findAll(req, res);
            await flushPromises();
            const callArg = events.findAll.mock.calls[0][0];
            expect(callArg.where.name).toBeDefined();
        });

        it("applies location_id filter", async () => {
            events.findAll.mockResolvedValue([]);
            const req = { query: { location_id: "5" } };
            const res = mockRes();
            eventsController.findAll(req, res);
            await flushPromises();
            const callArg = events.findAll.mock.calls[0][0];
            expect(callArg.where.location_id).toBe("5");
        });

        it("applies status filter", async () => {
            events.findAll.mockResolvedValue([]);
            const req = { query: { status: "active" } };
            const res = mockRes();
            eventsController.findAll(req, res);
            await flushPromises();
            const callArg = events.findAll.mock.calls[0][0];
            expect(callArg.where.status).toBe("active");
        });

        it("applies date range filter when start_at/end_at provided without status", async () => {
            events.findAll.mockResolvedValue([]);
            const req = { query: { start_at: "2024-01-01", end_at: "2024-12-31" } };
            const res = mockRes();
            eventsController.findAll(req, res);
            await flushPromises();
            const callArg = events.findAll.mock.calls[0][0];
            expect(callArg.where.start_at).toBeDefined();
            expect(callArg.where.end_at).toBeDefined();
        });

        it("applies testing_type_id filter", async () => {
            events.findAll.mockResolvedValue([]);
            const req = { query: { testing_type_id: "3" } };
            const res = mockRes();
            eventsController.findAll(req, res);
            await flushPromises();
            const callArg = events.findAll.mock.calls[0][0];
            expect(callArg.where.testing_type_id).toBe("3");
        });

        it("returns 500 on DB error during findAll", async () => {
            events.findAll.mockRejectedValue(new Error("Query failed"));
            const req = { query: {} };
            const res = mockRes();
            eventsController.findAll(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ message: "Query failed" });
        });

        it("returns 500 with default message when findAll error has no message", async () => {
            events.findAll.mockRejectedValue({});
            const req = { query: {} };
            const res = mockRes();
            eventsController.findAll(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ message: "Error while findAll events." });
        });
    });

    describe("update", () => {
        it("returns 200 when num === 1", async () => {
            events.update.mockResolvedValue([1]);
            const req = { params: { id: "1" }, body: { name: "Updated", start_at: "2024-01-01", end_at: "2024-01-02" } };
            const res = mockRes();
            eventsController.update(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it("returns 404 when num !== 1", async () => {
            events.update.mockResolvedValue([0]);
            const req = { params: { id: "99" }, body: { name: "Updated", start_at: "2024-01-01", end_at: "2024-01-02" } };
            const res = mockRes();
            eventsController.update(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it("returns 500 on DB error during update", async () => {
            events.update.mockRejectedValue(new Error("Update failed"));
            const req = { params: { id: "1" }, body: { name: "Updated", start_at: "2024-01-01", end_at: "2024-01-02" } };
            const res = mockRes();
            eventsController.update(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe("delete", () => {
        it("returns 204 when num === 1", async () => {
            events.destroy.mockResolvedValue(1);
            const req = { params: { id: "1" } };
            const res = mockRes();
            eventsController.delete(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(204);
        });

        it("returns 404 when num !== 1", async () => {
            events.destroy.mockResolvedValue(0);
            const req = { params: { id: "99" } };
            const res = mockRes();
            eventsController.delete(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it("returns 500 on DB error during delete", async () => {
            events.destroy.mockRejectedValue(new Error("Delete failed"));
            const req = { params: { id: "1" } };
            const res = mockRes();
            eventsController.delete(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
