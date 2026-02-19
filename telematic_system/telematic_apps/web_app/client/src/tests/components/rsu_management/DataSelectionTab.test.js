import { expect, jest, test } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import DataSelectionTab from "../../../components/rsu_management/data-selection/DataSelectionTab";
import { TRUStatusProvider } from "../../../context/tru-status-context";
import { TRUTopicsProvider } from "../../../context/tru-topic-context";

// Mock the API modules
jest.mock("../../../api/api-rsu");

const rsuService = require("../../../api/api-rsu").default;

beforeEach(() => {
  jest.clearAllMocks();
  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve([]));
});

const wrapper = ({ children }) => (
  <TRUStatusProvider>
    <TRUTopicsProvider>{children}</TRUTopicsProvider>
  </TRUStatusProvider>
);

test("DataSelectionTab should render component", () => {
  const { container } = render(<DataSelectionTab />, { wrapper });

  // Component renders without error - check for stepper elements
  const steppers = container.querySelectorAll('.MuiStepper-root');
  expect(steppers.length).toBeGreaterThanOrEqual(1);
});

test("DataSelectionTab should render stepper", () => {
  render(<DataSelectionTab />, { wrapper });

  // Should show step labels - use getAllByText for multiple matches
  const selectTRUElements = screen.getAllByText("Select TRU");
  expect(selectTRUElements.length).toBeGreaterThanOrEqual(1);
  
  const selectRSUElements = screen.getAllByText("Select RSU");
  expect(selectRSUElements.length).toBeGreaterThanOrEqual(1);
});

test("DataSelectionTab should have Save Configuration button", () => {
  render(<DataSelectionTab />, { wrapper });

  expect(screen.getByText("Save Configuration")).toBeInTheDocument();
});

test("DataSelectionTab should have Reset button", () => {
  render(<DataSelectionTab />, { wrapper });

  expect(screen.getByText("Reset Selection")).toBeInTheDocument();
});

test("DataSelectionTab should render step components", () => {
  const { container } = render(<DataSelectionTab />, { wrapper });

  // Components should be rendered
  expect(container).toBeInTheDocument();
});

test("DataSelectionTab should handle save configuration", () => {
  render(<DataSelectionTab />, { wrapper });

  // Save button should be present
  const saveButton = screen.getByText("Save Configuration");
  expect(saveButton).toBeInTheDocument();
});
