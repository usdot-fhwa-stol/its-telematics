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
    default_event_topics: { destroy: jest.fn(), bulkCreate: jest.fn(), findAll: jest.fn() },
    Sequelize: { Op: {} }
}));

const { default_event_topics } = require("../models");
const defaultEventTopicsController = require("../controllers/default_event_topics.controller");
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

const validBody = () => ({
    user_id: 10,
    unitsTopics: [{
        event_id: 1,
        unit_identifier: "unit-001",
        unit_topics: [{ topics: [{ name: "topic_a" }, { name: "topic_b" }] }]
    }]
});

describe("default_event_topics.controller", () => {
    beforeEach(() => jest.clearAllMocks());

    describe("create", () => {
        it("returns 404 when a unit has no event_id", () => {
            const req = { body: { user_id: 10, unitsTopics: [{ unit_identifier: "unit-001", unit_topics: [] }] } };
            const res = mockRes();
            defaultEventTopicsController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({ message: "Event Id is empty." });
        });

        it("returns 404 when a unit has no unit_identifier", () => {
            const req = { body: { user_id: 10, unitsTopics: [{ event_id: 1, unit_topics: [] }] } };
            const res = mockRes();
            defaultEventTopicsController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({ message: "Unit identifier is empty." });
        });

        it("calls destroy then bulkCreate and returns 201 on success", async () => {
            default_event_topics.destroy.mockResolvedValue(1);
            const created = [{ id: 1 }];
            default_event_topics.bulkCreate.mockResolvedValue(created);
            const req = { body: validBody() };
            const res = mockRes();
            defaultEventTopicsController.create(req, res);
            await flushPromises();
            expect(default_event_topics.destroy).toHaveBeenCalled();
            expect(default_event_topics.bulkCreate).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith(created);
        });

        it("returns 500 when bulkCreate rejects", async () => {
            default_event_topics.destroy.mockResolvedValue(0);
            default_event_topics.bulkCreate.mockRejectedValue(new Error("Bulk create failed"));
            const req = { body: validBody() };
            const res = mockRes();
            defaultEventTopicsController.create(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ message: "Bulk create failed" });
        });

        it("returns 500 with default message when bulkCreate error has no message", async () => {
            default_event_topics.destroy.mockResolvedValue(0);
            default_event_topics.bulkCreate.mockRejectedValue({});
            const req = { body: validBody() };
            const res = mockRes();
            defaultEventTopicsController.create(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ message: "Error while creating default_event_topics." });
        });

        it("concatenates topic names into comma-separated string", async () => {
            default_event_topics.destroy.mockResolvedValue(0);
            default_event_topics.bulkCreate.mockResolvedValue([]);
            const req = { body: validBody() };
            const res = mockRes();
            defaultEventTopicsController.create(req, res);
            await flushPromises();
            const bulkArg = default_event_topics.bulkCreate.mock.calls[0][0];
            expect(bulkArg[0].topic_names).toContain("topic_a,");
            expect(bulkArg[0].topic_names).toContain("topic_b,");
        });
    });

    describe("findAll", () => {
        it("returns 200 with data on success", async () => {
            const data = [{ id: 1, event_id: 1, unit_identifier: "unit-001" }];
            default_event_topics.findAll.mockResolvedValue(data);
            const req = { query: { event_id: "1", unit_identifiers: ["unit-001"], user_id: "10" } };
            const res = mockRes();
            defaultEventTopicsController.findAll(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(data);
        });

        it("returns 500 on DB error", async () => {
            default_event_topics.findAll.mockRejectedValue(new Error("Query failed"));
            const req = { query: { event_id: "1", unit_identifiers: [], user_id: "10" } };
            const res = mockRes();
            defaultEventTopicsController.findAll(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ message: "Query failed" });
        });

        it("returns 500 with default message when error has no message", async () => {
            default_event_topics.findAll.mockRejectedValue({});
            const req = { query: { event_id: "1", unit_identifiers: [], user_id: "10" } };
            const res = mockRes();
            defaultEventTopicsController.findAll(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ message: "Error while findAll default_event_topics." });
        });
    });
});
