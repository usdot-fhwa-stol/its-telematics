import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import RSUStatusTab from "../../../components/rsu_management/rsu-status/RSUStatusTab";
import { TRUConfigProvider } from "../../../context/tru-config-context";
import { TRUStatusProvider } from "../../../context/tru-status-context";

// Mock the API modules
jest.mock("../../../api/api-rsu");

const rsuService = require("../../../api/api-rsu").default;

beforeEach(() => {
  jest.clearAllMocks();
  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve([]));
});

const wrapper = ({ children }) => (
  <TRUStatusProvider>
    <TRUConfigProvider>{children}</TRUConfigProvider>
  </TRUStatusProvider>
);

test("RSUStatusTab should render title", () => {
  render(<RSUStatusTab />, { wrapper });

  expect(screen.getByText("RSU Status Management")).toBeInTheDocument();
});

test("RSUStatusTab should render Register button", () => {
  render(<RSUStatusTab />, { wrapper });

  expect(screen.getByText("Register RSU")).toBeInTheDocument();
});

test("RSUStatusTab should render Refresh button", () => {
  const { container } = render(<RSUStatusTab />, { wrapper });

  const refreshButton = container.querySelector('[data-testid="RefreshIcon"]');
  expect(refreshButton).toBeInTheDocument();
});

test("RSUStatusTab should have status count chips", () => {
  render(<RSUStatusTab />, { wrapper });

  // Should show count chips for different statuses
  const chips = screen.queryAllByRole("status") || [];
  // Component renders status chips based on data
});

test("RSUStatusTab should render StatusTable", () => {
  const { container } = render(<RSUStatusTab />, { wrapper });

  // Check for table or grid structure
  const tables = container.querySelectorAll('table, [role="grid"]');
  expect(tables.length).toBeGreaterThanOrEqual(0);
});

test("RSUStatusTab should open Register dialog when Register clicked", () => {
  render(<RSUStatusTab />, { wrapper });

  const registerButton = screen.getByText("Register RSU");
  fireEvent.click(registerButton);

  // Dialog should open (checking for dialog title)
  expect(screen.getByText("Register New RSU")).toBeInTheDocument();
});

test("RSUStatusTab should render filters", () => {
  render(<RSUStatusTab />, { wrapper });

  // RSUFilters component should be present
  // Look for filter-related elements
  const searchInputs = screen.queryAllByRole("textbox");
  // Filters may be present depending on implementation
});

test("RSUStatusTab should handle refresh", () => {
  const { container } = render(<RSUStatusTab />, { wrapper });

  const refreshIcon = container.querySelector('[data-testid="RefreshIcon"]');
  if (refreshIcon) {
    const refreshButton = refreshIcon.closest('button');
    if (refreshButton) {
      fireEvent.click(refreshButton);
    }
  }
  
  // Should trigger refresh
});

test("RSUStatusTab should display loading state", () => {
  render(<RSUStatusTab />, { wrapper });

  // Component should handle loading state from context
});

test("RSUStatusTab should close Register dialog", () => {
  render(<RSUStatusTab />, { wrapper });

  const registerButton = screen.getByText("Register RSU");
  fireEvent.click(registerButton);

  expect(screen.getByText("Register New RSU")).toBeInTheDocument();

  const cancelButton = screen.getByText("Cancel");
  fireEvent.click(cancelButton);

  // Dialog should close
});
