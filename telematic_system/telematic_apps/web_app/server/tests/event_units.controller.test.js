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
    events: { findByPk: jest.fn() },
    locations: {},
    testing_types: {},
    units: { findByPk: jest.fn() },
    event_units: { destroy: jest.fn() },
    Sequelize: { Op: {} }
}));

const { events, units, event_units } = require("../models");
const eventUnitsController = require("../controllers/event_units.controller");
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

describe("event_units.controller", () => {
    beforeEach(() => jest.clearAllMocks());

    describe("create", () => {
        it("returns 400 when request body is falsy", () => {
            const req = { body: null };
            const res = mockRes();
            eventUnitsController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("returns null when event is not found", async () => {
            events.findByPk.mockResolvedValue(null);
            const req = { body: { event_unit: { eventId: 99, unitId: 1, start_time: "2024-01-01", end_time: "2024-01-02" } } };
            const res = mockRes();
            const result = await eventUnitsController.create(req, res);
            expect(result).toBeNull();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("returns null when unit is not found", async () => {
            const fakeEvent = { addUnits: jest.fn() };
            events.findByPk.mockResolvedValue(fakeEvent);
            units.findByPk.mockResolvedValue(null);
            const req = { body: { event_unit: { eventId: 1, unitId: 99, start_time: "2024-01-01", end_time: "2024-01-02" } } };
            const res = mockRes();
            const result = await eventUnitsController.create(req, res);
            expect(result).toBeNull();
        });

        it("returns 200 with the event when both event and unit found", async () => {
            const fakeEvent = { id: 1, addUnits: jest.fn() };
            const fakeUnit = { id: 1, unit_identifier: "unit-001" };
            events.findByPk.mockResolvedValue(fakeEvent);
            units.findByPk.mockResolvedValue(fakeUnit);
            const req = { body: { event_unit: { eventId: 1, unitId: 1, start_time: "2024-01-01", end_time: "2024-01-02" } } };
            const res = mockRes();
            await eventUnitsController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(fakeEvent);
            expect(fakeEvent.addUnits).toHaveBeenCalledWith(fakeUnit);
        });

        it("logs error when findByPk rejects", async () => {
            events.findByPk.mockRejectedValue(new Error("DB error"));
            const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
            const req = { body: { event_unit: { eventId: 1, unitId: 1, start_time: "2024-01-01", end_time: "2024-01-02" } } };
            const res = mockRes();
            await eventUnitsController.create(req, res);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe("delete", () => {
        it("returns 404 when event_id is undefined", () => {
            const req = { query: { unit_id: "1" } };
            const res = mockRes();
            eventUnitsController.delete(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it("returns 404 when unit_id is undefined", () => {
            const req = { query: { event_id: "1" } };
            const res = mockRes();
            eventUnitsController.delete(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it("returns 200 when deleted successfully", async () => {
            event_units.destroy.mockResolvedValue(1);
            const req = { query: { event_id: "1", unit_id: "2" } };
            const res = mockRes();
            eventUnitsController.delete(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({ message: "Event unit was deleted successfully." });
        });

        it("returns 404 when num !== 1", async () => {
            event_units.destroy.mockResolvedValue(0);
            const req = { query: { event_id: "1", unit_id: "99" } };
            const res = mockRes();
            eventUnitsController.delete(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it("returns 500 on DB error", async () => {
            event_units.destroy.mockRejectedValue(new Error("Delete failed"));
            const req = { query: { event_id: "1", unit_id: "2" } };
            const res = mockRes();
            eventUnitsController.delete(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
