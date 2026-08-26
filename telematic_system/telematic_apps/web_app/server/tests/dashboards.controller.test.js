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
    dashboard: { findAll: jest.fn() },
    event_dashboard: { findAll: jest.fn(), create: jest.fn(), destroy: jest.fn() },
    Sequelize: { Op: { and: Symbol("and") } }
}));

// dashboards.controller.js imports Op directly from 'sequelize'
jest.mock("sequelize", () => ({ Op: { and: Symbol("and") } }), { virtual: true });

const { dashboard, event_dashboard } = require("../models");
const dashboardsController = require("../controllers/dashboards.controller");
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("dashboards.controller", () => {
    beforeEach(() => jest.clearAllMocks());

    describe("findDashboardsByOrg", () => {
        it("returns 400 when req.body is undefined", () => {
            const req = {};
            const res = mockRes();
            dashboardsController.findDashboardsByOrg(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("returns 400 when req.body.data is undefined", () => {
            const req = { body: {} };
            const res = mockRes();
            dashboardsController.findDashboardsByOrg(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("returns 400 when org_id is undefined", () => {
            const req = { body: { data: {} } };
            const res = mockRes();
            dashboardsController.findDashboardsByOrg(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("returns 200 with mapped dashboard list when data found", async () => {
            const fakeData = [{ slug: "slug1", uid: "uid1", title: "Dashboard 1", id: 1 }];
            dashboard.findAll.mockResolvedValue(fakeData);
            const req = { body: { data: { org_id: 1 } } };
            const res = mockRes();
            dashboardsController.findDashboardsByOrg(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith([{ slug: "slug1", uid: "uid1", title: "Dashboard 1", id: 1 }]);
        });

        it("does not call res.status when data array is empty", async () => {
            dashboard.findAll.mockResolvedValue([]);
            const req = { body: { data: { org_id: 1 } } };
            const res = mockRes();
            dashboardsController.findDashboardsByOrg(req, res);
            await flushPromises();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("returns 500 on DB error", async () => {
            dashboard.findAll.mockRejectedValue(new Error("DB error"));
            const req = { body: { data: { org_id: 1 } } };
            const res = mockRes();
            dashboardsController.findDashboardsByOrg(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe("searchDashboardsByOrg", () => {
        it("returns 400 when search_text is missing", () => {
            const req = { body: { data: { org_id: 1 } } };
            const res = mockRes();
            dashboardsController.searchDashboardsByOrg(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("returns 400 when search_text is empty string", () => {
            const req = { body: { data: { org_id: 1, search_text: "" } } };
            const res = mockRes();
            dashboardsController.searchDashboardsByOrg(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("returns 200 with filtered dashboards matching search text", async () => {
            const fakeData = [
                { slug: "s1", uid: "u1", title: "Traffic Dashboard", id: 1, is_folder: 0 },
                { slug: "s2", uid: "u2", title: "Other Panel", id: 2, is_folder: 0 }
            ];
            dashboard.findAll.mockResolvedValue(fakeData);
            const req = { body: { data: { org_id: 1, search_text: "traffic" } } };
            const res = mockRes();
            dashboardsController.searchDashboardsByOrg(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(200);
            const sent = res.send.mock.calls[0][0];
            expect(sent).toHaveLength(1);
            expect(sent[0].title).toBe("Traffic Dashboard");
        });

        it("returns 200 with empty array when no match", async () => {
            dashboard.findAll.mockResolvedValue([{ slug: "s1", uid: "u1", title: "Other", id: 1, is_folder: 0 }]);
            const req = { body: { data: { org_id: 1, search_text: "traffic" } } };
            const res = mockRes();
            dashboardsController.searchDashboardsByOrg(req, res);
            await flushPromises();
            expect(res.send).toHaveBeenCalledWith([]);
        });

        it("skips folder items (is_folder !== 0)", async () => {
            dashboard.findAll.mockResolvedValue([{ slug: "s1", uid: "u1", title: "Traffic Folder", id: 1, is_folder: 1 }]);
            const req = { body: { data: { org_id: 1, search_text: "traffic" } } };
            const res = mockRes();
            dashboardsController.searchDashboardsByOrg(req, res);
            await flushPromises();
            expect(res.send).toHaveBeenCalledWith([]);
        });

        it("returns 500 on DB error", async () => {
            dashboard.findAll.mockRejectedValue(new Error("DB error"));
            const req = { body: { data: { org_id: 1, search_text: "traffic" } } };
            const res = mockRes();
            dashboardsController.searchDashboardsByOrg(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe("listEventDashboards", () => {
        it("returns 400 when event_id is missing", () => {
            const req = { body: { data: {} } };
            const res = mockRes();
            dashboardsController.listEventDashboards(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("returns 200 with data on success", async () => {
            const fakeData = [{ event_id: 1, dashboard_id: 5 }];
            event_dashboard.findAll.mockResolvedValue(fakeData);
            const req = { body: { data: { event_id: 1 } } };
            const res = mockRes();
            dashboardsController.listEventDashboards(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(fakeData);
        });

        it("returns 500 on DB error", async () => {
            event_dashboard.findAll.mockRejectedValue(new Error("DB error"));
            const req = { body: { data: { event_id: 1 } } };
            const res = mockRes();
            dashboardsController.listEventDashboards(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe("updateEventDashboards", () => {
        it("returns 400 when event_id is missing", () => {
            const req = { body: { data: { dashboard_id: 5 } } };
            const res = mockRes();
            dashboardsController.updateEventDashboards(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("returns 400 when dashboard_id is missing", () => {
            const req = { body: { data: { event_id: 1 } } };
            const res = mockRes();
            dashboardsController.updateEventDashboards(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("returns 200 with created record on success", async () => {
            const newRecord = { event_id: 1, dashboard_id: 5 };
            event_dashboard.create.mockResolvedValue(newRecord);
            const req = { body: { data: { event_id: 1, dashboard_id: 5 } } };
            const res = mockRes();
            dashboardsController.updateEventDashboards(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(newRecord);
        });

        it("returns 500 on DB error", async () => {
            event_dashboard.create.mockRejectedValue(new Error("DB error"));
            const req = { body: { data: { event_id: 1, dashboard_id: 5 } } };
            const res = mockRes();
            dashboardsController.updateEventDashboards(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe("deleteEventDashboards", () => {
        it("returns 400 when event_id is missing from query", () => {
            const req = { query: { dashboard_id: "5" } };
            const res = mockRes();
            dashboardsController.deleteEventDashboards(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("returns 400 when dashboard_id is missing from query", () => {
            const req = { query: { event_id: "1" } };
            const res = mockRes();
            dashboardsController.deleteEventDashboards(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("returns 200 with success message on delete", async () => {
            event_dashboard.destroy.mockResolvedValue(1);
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
            const req = { query: { event_id: "1", dashboard_id: "5" } };
            const res = mockRes();
            dashboardsController.deleteEventDashboards(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({ message: "Successfully unassign dashboard!" });
            consoleSpy.mockRestore();
        });

        it("returns 500 on DB error", async () => {
            event_dashboard.destroy.mockRejectedValue(new Error("DB error"));
            const req = { query: { event_id: "1", dashboard_id: "5" } };
            const res = mockRes();
            dashboardsController.deleteEventDashboards(req, res);
            await flushPromises();
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
