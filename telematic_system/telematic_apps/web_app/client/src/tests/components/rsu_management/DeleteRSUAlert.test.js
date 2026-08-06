import { expect, jest, test } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import DeleteRSUAlert from "../../../components/rsu_management/rsu-status/components/DeleteRSUAlert";
import { TRUConfigProvider } from "../../../context/tru-config-context";
import { TRUStatusProvider } from "../../../context/tru-status-context";

// Mock the API modules
jest.mock("../../../api/api-rsu");

const rsuService = require("../../../api/api-rsu").default;

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Setup default mock implementations
  rsuService.assignRSU = jest.fn(() => Promise.resolve({ success: true }));
  rsuService.updateRSUConfig = jest.fn(() => Promise.resolve({ success: true }));
  rsuService.removeRSU = jest.fn(() => Promise.resolve({ success: true }));
});

const mockRSU = {
  ip: "192.168.1.100",
  port: 8080,
  unitId: "TRU-001",
};

const wrapper = ({ children }) => (
  <TRUStatusProvider>
    <TRUConfigProvider>{children}</TRUConfigProvider>
  </TRUStatusProvider>
);

test("DeleteRSUAlert should render when open", () => {
  render(
    <DeleteRSUAlert open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  expect(screen.getByText("Confirm Delete RSU")).toBeInTheDocument();
  expect(screen.getByText("Are you sure you want to delete this RSU?")).toBeInTheDocument();
});

test("DeleteRSUAlert should not render when closed", () => {
  const { container } = render(
    <DeleteRSUAlert open={false} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
});

test("DeleteRSUAlert should display RSU information", () => {
  render(
    <DeleteRSUAlert open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  expect(screen.getByText(/192.168.1.100/)).toBeInTheDocument();
  expect(screen.getByText(/8080/)).toBeInTheDocument();
});

test("DeleteRSUAlert should display warning message", () => {
  render(
    <DeleteRSUAlert open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
  expect(screen.getByText(/permanently removed/)).toBeInTheDocument();
});

test("DeleteRSUAlert should have Cancel button", () => {
  render(
    <DeleteRSUAlert open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  expect(screen.getByText("Cancel")).toBeInTheDocument();
});

test("DeleteRSUAlert should have Delete button", () => {
  render(
    <DeleteRSUAlert open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  expect(screen.getByText("Delete")).toBeInTheDocument();
});

test("DeleteRSUAlert should call onClose when Cancel clicked", () => {
  const mockOnClose = jest.fn();
  render(
    <DeleteRSUAlert open={true} onClose={mockOnClose} rsu={mockRSU} />,
    { wrapper }
  );

  const cancelButton = screen.getByText("Cancel");
  fireEvent.click(cancelButton);

  expect(mockOnClose).toHaveBeenCalledTimes(1);
});

test("DeleteRSUAlert should show loading state on Delete button", async () => {
  rsuService.removeRSU.mockImplementation(() => new Promise(() => {})); // Never resolves

  render(
    <DeleteRSUAlert open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  const deleteButton = screen.getByText("Delete");
  fireEvent.click(deleteButton);

  await waitFor(() => {
    expect(screen.getByText("Deleting...")).toBeInTheDocument();
  });
});

test("DeleteRSUAlert should disable buttons during delete", async () => {
  rsuService.removeRSU.mockImplementation(() => new Promise(() => {})); // Never resolves

  render(
    <DeleteRSUAlert open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  const deleteButton = screen.getByText("Delete");
  fireEvent.click(deleteButton);

  await waitFor(() => {
    expect(screen.getByText("Cancel")).toBeDisabled();
  });
});

test("DeleteRSUAlert should call onSuccess and onClose after successful delete", async () => {
  rsuService.removeRSU.mockResolvedValueOnce({ success: true });

  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  render(
    <DeleteRSUAlert
      open={true}
      onClose={mockOnClose}
      onSuccess={mockOnSuccess}
      rsu={mockRSU}
    />,
    { wrapper }
  );

  const deleteButton = screen.getByText("Delete");
  
  await act(async () => {
    fireEvent.click(deleteButton);
  });

  await waitFor(() => {
    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

test("DeleteRSUAlert should display error message on failure", async () => {
  rsuService.removeRSU.mockRejectedValueOnce(new Error("Network error"));

  render(
    <DeleteRSUAlert open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  const deleteButton = screen.getByText("Delete");
  
  await act(async () => {
    fireEvent.click(deleteButton);
  });

  await waitFor(() => {
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });
});

test("DeleteRSUAlert should display API error message on failure", async () => {
  rsuService.removeRSU.mockRejectedValueOnce({
    response: { data: { message: "RSU not found" } },
  });

  render(
    <DeleteRSUAlert open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  const deleteButton = screen.getByText("Delete");
  
  await act(async () => {
    fireEvent.click(deleteButton);
  });

  await waitFor(() => {
    expect(screen.getByText("RSU not found")).toBeInTheDocument();
  });
});

test("DeleteRSUAlert should clear error when closed", async () => {
  rsuService.removeRSU.mockRejectedValueOnce(new Error("Network error"));

  const mockOnClose = jest.fn();
  const { rerender } = render(
    <DeleteRSUAlert open={true} onClose={mockOnClose} rsu={mockRSU} />,
    { wrapper }
  );

  const deleteButton = screen.getByText("Delete");
  
  await act(async () => {
    fireEvent.click(deleteButton);
  });

  await waitFor(() => {
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  // Click cancel to close
  const cancelButton = screen.getByText("Cancel");
  fireEvent.click(cancelButton);

  expect(mockOnClose).toHaveBeenCalled();
});

test("DeleteRSUAlert should render warning icon", () => {
  render(
    <DeleteRSUAlert open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  const dialogTitle = screen.getByText("Confirm Delete RSU").closest("h2");
  expect(dialogTitle).toBeInTheDocument();
});

test("DeleteRSUAlert should handle null RSU gracefully", () => {
  render(
    <DeleteRSUAlert open={true} onClose={() => {}} rsu={null} />,
    { wrapper }
  );

  expect(screen.getByText("Confirm Delete RSU")).toBeInTheDocument();
  expect(screen.getByText("Are you sure you want to delete this RSU?")).toBeInTheDocument();
});
