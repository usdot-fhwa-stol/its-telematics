import { expect, test } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { act } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import * as adminAccessApi from "../../api/api-admin-access";
import * as orgApi from "../../api/api-org";
import * as userApi from "../../api/api-user";
import NavMenu from "../../components/layout/NavMenu";
import AuthContext from "../../context/auth-context";

jest.mock("../../api/api-admin-access", () => ({
  getVerifiedAdminAccess: jest.fn(),
}));

test("Test NavMenu checkServerSession", async () => {
  jest.spyOn(userApi, "checkServerSession").mockResolvedValue({});
  jest.spyOn(orgApi, "getUserRole").mockResolvedValue([{ role: "Admin" }]);
  adminAccessApi.getVerifiedAdminAccess.mockResolvedValue(true);
  const value = {
    user_id: 1,
    isAuth: "true",
    username: "test",
    email: "test@telematic.com",
    sessionToken: "sessionToken",
    last_seen_at: 0,
    org_id: "1",
    name: "test",
    org_name: "my-org",
    is_admin: "1",
    role: "Admin",
    sessionExpiredAt: 100000,
    updateRole: jest.fn(),
  };
  render(
      <MemoryRouter initialEntries={["/telematic/events"]}>
        <AuthContext.Provider value={value}>
          <NavMenu />
        </AuthContext.Provider>
      </MemoryRouter>
  );

await waitFor(() => {
    expect(screen.getByTitle('Logout')).toBeInTheDocument();
    expect(document.querySelector('a[href="/telematic/admin"]')).not.toBeNull();
});
});

test("NavMenu hides admin link when backend denies admin access", async () => {
 jest.spyOn(userApi, "checkServerSession").mockResolvedValue({});
 jest.spyOn(orgApi, "getUserRole").mockResolvedValue([{ role: "Viewer" }]);
 adminAccessApi.getVerifiedAdminAccess.mockResolvedValue(false);
const value = {
    user_id: 1,
    isAuth: "true",
    username: "test",
    email: "test@telematic.com",
    sessionToken: "sessionToken",
    last_seen_at: 0,
    org_id: "1",
    name: "test",
    org_name: "my-org",
    is_admin: "1",
    role: "Admin",
    sessionExpiredAt: 100000,
    updateRole: jest.fn(),
  };
  render(
    <MemoryRouter initialEntries={["/telematic/events"]}>
      <AuthContext.Provider value={value}>
        <NavMenu />
      </AuthContext.Provider>
    </MemoryRouter>
  );

 await waitFor(() => {
   expect(screen.getByTitle('Logout')).toBeInTheDocument();
 });
 expect(document.querySelector('a[href="/telematic/admin"]')).toBeNull();
});
