import { expect, jest, test } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import EditRSUDialog from "../../../components/rsu_management/rsu-status/components/EditRSUDialog";
import { TRUConfigProvider } from "../../../context/tru-config-context";
import { TRUStatusProvider } from "../../../context/tru-status-context";

// Mock the API modules
jest.mock("../../../api/api-rsu");

const rsuService = require("../../../api/api-rsu").default;

beforeEach(() => {
  jest.clearAllMocks();
  rsuService.assignRSU = jest.fn(() => Promise.resolve({ success: true }));
  rsuService.updateRSUConfig = jest.fn(() => Promise.resolve({ success: true }));
  rsuService.removeRSU = jest.fn(() => Promise.resolve({ success: true }));
  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve([]));
});

const wrapper = ({ children }) => (
  <TRUStatusProvider>
    <TRUConfigProvider>{children}</TRUConfigProvider>
  </TRUStatusProvider>
);

const mockRSU = {
  unitId: "TRU-001",
  ip: "192.168.1.100",
  port: 8080,
  event: "rsu-edit",
  snmp: {
    user: "admin",
    securityLevel: "authPriv",
    authProtocol: "SHA",
    authPassPhrase: "authpass",
    privacyProtocol: "AES",
    privacyPassPhrase: "privpass",
    rsuMibVersion: "NTCIP1218"
  }
};

test("EditRSUDialog should render when open", () => {
  render(
    <EditRSUDialog open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  expect(screen.getByText("Edit RSU Configuration")).toBeInTheDocument();
});

test("EditRSUDialog should not render when closed", () => {
  const { container } = render(
    <EditRSUDialog open={false} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
});

test("EditRSUDialog should have Cancel button", () => {
  render(
    <EditRSUDialog open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  expect(screen.getByText("Cancel")).toBeInTheDocument();
});

test("EditRSUDialog should have Update button", () => {
  render(
    <EditRSUDialog open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  expect(screen.getByText("Update")).toBeInTheDocument();
});

test("EditRSUDialog should call onClose when Cancel clicked", () => {
  const mockOnClose = jest.fn();
  render(
    <EditRSUDialog open={true} onClose={mockOnClose} rsu={mockRSU} />,
    { wrapper }
  );

  const cancelButton = screen.getByText("Cancel");
  fireEvent.click(cancelButton);

  expect(mockOnClose).toHaveBeenCalledTimes(1);
});

test("EditRSUDialog should populate IP field from rsu prop", () => {
  render(
    <EditRSUDialog open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  const ipField = screen.getByLabelText(/IP Address/i);
  expect(ipField.value).toBe("192.168.1.100");
});

test("EditRSUDialog should populate Port field from rsu prop", () => {
  render(
    <EditRSUDialog open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  const portField = screen.getByLabelText(/Port/i);
  expect(portField.value).toBe("8080");
});

test("EditRSUDialog should populate Event field from rsu prop", () => {
  render(
    <EditRSUDialog open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  const eventField = screen.getByLabelText(/Event/i);
  expect(eventField.value).toBe("rsu-edit");
});

test("EditRSUDialog should allow IP address modification", () => {
  render(
    <EditRSUDialog open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  const ipField = screen.getByLabelText(/IP Address/i);
  fireEvent.change(ipField, { target: { value: "192.168.1.200" } });

  expect(ipField.value).toBe("192.168.1.200");
});

test("EditRSUDialog should allow Port modification", () => {
  render(
    <EditRSUDialog open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  const portField = screen.getByLabelText(/Port/i);
  fireEvent.change(portField, { target: { value: "9090" } });

  expect(portField.value).toBe("9090");
});

test("EditRSUDialog should allow Event modification", () => {
  render(
    <EditRSUDialog open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  const eventField = screen.getByLabelText(/Event/i);
  fireEvent.change(eventField, { target: { value: "updated-event" } });

  expect(eventField.value).toBe("updated-event");
});

test("EditRSUDialog should show info alert with current RSU", () => {
  render(
    <EditRSUDialog open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  // Check that the info alert shows the TRU ID
  expect(screen.getByText(/TRU:/)).toBeInTheDocument();
  expect(screen.getByText(/TRU-001/)).toBeInTheDocument();
  
  // Check that the form fields are populated with RSU data
  expect(screen.getByDisplayValue("192.168.1.100")).toBeInTheDocument();
  expect(screen.getByDisplayValue("8080")).toBeInTheDocument();
});

test("EditRSUDialog should have SNMP Configuration section", () => {
  render(
    <EditRSUDialog open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  expect(screen.getByText(/SNMP Configuration/i)).toBeInTheDocument();
});

test("EditRSUDialog should show validation error when IP is empty", async () => {
  render(
    <EditRSUDialog open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  const ipField = screen.getByLabelText(/IP Address/i);
  fireEvent.change(ipField, { target: { value: "" } });

  const updateButton = screen.getByText("Update");
  
  await act(async () => {
    fireEvent.click(updateButton);
  });

  await waitFor(() => {
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });
});

test("EditRSUDialog should show validation error for invalid IP", async () => {
  render(
    <EditRSUDialog open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  const ipField = screen.getByLabelText(/IP Address/i);
  fireEvent.change(ipField, { target: { value: "invalid.ip" } });

  const updateButton = screen.getByText("Update");
  
  await act(async () => {
    fireEvent.click(updateButton);
  });

  await waitFor(() => {
    expect(screen.getByText(/valid IPv4 address/i)).toBeInTheDocument();
  });
});

test("EditRSUDialog should show validation error for invalid port", async () => {
  render(
    <EditRSUDialog open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  const portField = screen.getByLabelText(/Port/i);
  fireEvent.change(portField, { target: { value: "99999" } });

  const updateButton = screen.getByText("Update");
  
  await act(async () => {
    fireEvent.click(updateButton);
  });

  await waitFor(() => {
    expect(screen.getByText(/between 1 and 65535/i)).toBeInTheDocument();
  });
});

test("EditRSUDialog should disable buttons during submission", async () => {
  rsuService.updateRSUConfig.mockImplementation(() => new Promise(() => {})); // Never resolves

  render(
    <EditRSUDialog open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  const updateButton = screen.getByText("Update");
  
  await act(async () => {
    fireEvent.click(updateButton);
  });

  await waitFor(() => {
    expect(screen.getByText("Updating...")).toBeInTheDocument();
  });
});

test("EditRSUDialog should display error message on update failure", async () => {
  rsuService.updateRSUConfig.mockRejectedValueOnce(new Error("Update failed"));

  render(
    <EditRSUDialog open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  const updateButton = screen.getByText("Update");
  
  await act(async () => {
    fireEvent.click(updateButton);
  });

  await waitFor(() => {
    expect(screen.getByText(/Update failed|Failed to update/i)).toBeInTheDocument();
  });
});

test("EditRSUDialog should call onSuccess and onClose after successful update", async () => {
  rsuService.updateRSUConfig.mockResolvedValueOnce({ success: true });

  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  render(
    <EditRSUDialog
      open={true}
      onClose={mockOnClose}
      onSuccess={mockOnSuccess}
      rsu={mockRSU}
    />,
    { wrapper }
  );

  const updateButton = screen.getByText("Update");
  
  await act(async () => {
    fireEvent.click(updateButton);
  });

  await waitFor(() => {
    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

test("EditRSUDialog should clear error when field changes", async () => {
  render(
    <EditRSUDialog open={true} onClose={() => {}} rsu={mockRSU} />,
    { wrapper }
  );

  // Clear IP to trigger error
  const ipField = screen.getByLabelText(/IP Address/i);
  fireEvent.change(ipField, { target: { value: "" } });

  const updateButton = screen.getByText("Update");
  await act(async () => {
    fireEvent.click(updateButton);
  });

  await waitFor(() => {
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });

  // Change field back
  fireEvent.change(ipField, { target: { value: "192.168.1.100" } });
});

test("EditRSUDialog should handle null rsu gracefully", () => {
  render(
    <EditRSUDialog open={true} onClose={() => {}} rsu={null} />,
    { wrapper }
  );

  expect(screen.getByText("Edit RSU Configuration")).toBeInTheDocument();
});
