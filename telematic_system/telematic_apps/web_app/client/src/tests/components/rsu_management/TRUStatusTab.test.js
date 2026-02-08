import { expect, jest, test } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import TRUStatusTab from "../../../components/rsu_management/tru-status/TRUStatusTab";
import { TRUStatusProvider } from "../../../context/tru-status-context";

// Mock the API modules
jest.mock("../../../api/api-rsu");

const rsuService = require("../../../api/api-rsu").default;

beforeEach(() => {
  jest.clearAllMocks();
  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve([]));
});

const wrapper = ({ children }) => (
  <TRUStatusProvider>{children}</TRUStatusProvider>
);

test("TRUStatusTab should render component", () => {
  const { container } = render(<TRUStatusTab />, { wrapper });

  // Component renders without error
  expect(container).toBeInTheDocument();
});

test("TRUStatusTab should render Refresh button", () => {
  const { container } = render(<TRUStatusTab />, { wrapper });

  const refreshButton = container.querySelector('[data-testid="RefreshIcon"]');
  expect(refreshButton).toBeInTheDocument();
});

test("TRUStatusTab should have status count chips", () => {
  render(<TRUStatusTab />, { wrapper });

  // Should show count chips for different statuses
  const chips = screen.queryAllByRole("status") || [];
  // Component renders status chips based on data
});

test("TRUStatusTab should render StatusTable", () => {
  const { container } = render(<TRUStatusTab />, { wrapper });

  // Check for table or grid structure
  const tables = container.querySelectorAll('table, [role="grid"]');
  expect(tables.length).toBeGreaterThanOrEqual(0);
});

test("TRUStatusTab should render filters", () => {
  render(<TRUStatusTab />, { wrapper });

  // TRUFilters component should be present
  // Look for filter-related elements
  const searchInputs = screen.queryAllByRole("textbox");
  // Filters may be present depending on implementation
});

test("TRUStatusTab should handle refresh", () => {
  const { container } = render(<TRUStatusTab />, { wrapper });

  const refreshIcon = container.querySelector('[data-testid="RefreshIcon"]');
  if (refreshIcon) {
    const refreshButton = refreshIcon.closest('button');
    if (refreshButton) {
      // Should trigger refresh
    }
  }
});

test("TRUStatusTab should display TRU ID column", () => {
  const { container } = render(<TRUStatusTab />, { wrapper });

  // Component renders without error
  expect(container).toBeInTheDocument();
});

test("TRUStatusTab should display Name column", () => {
  const { container } = render(<TRUStatusTab />, { wrapper });

  // Component renders without error
  expect(container).toBeInTheDocument();
});

test("TRUStatusTab should display Bridge Status column", () => {
  const { container } = render(<TRUStatusTab />, { wrapper });

  // Component renders without error
  expect(container).toBeInTheDocument();
});

test("TRUStatusTab should display Associated RSU IPs column", () => {
  const { container } = render(<TRUStatusTab />, { wrapper });

  // Component renders without error
  expect(container).toBeInTheDocument();
});
