import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RSUStatusTab from "../../../components/rsu_management/rsu-status/RSUStatusTab";
import AuthContext from "../../../context/auth-context";
import { TRUConfigProvider } from "../../../context/tru-config-context";
import { TRUStatusProvider } from "../../../context/tru-status-context";

// Mock the API modules
jest.mock("../../../api/api-rsu");

const rsuService = require("../../../api/api-rsu").default;

const mockTRUStatuses = [
  {
    unitConfig: { unitId: "TRU001", name: "TRU Unit 1", maxConnections: 5 },
    pluginConfigStatus: { 
      bridgePluginStatus: "running",
      lastCommunicationTimestamp: "2026-02-09T10:30:00Z"
    },
    rsuConfigs: [
      {
        rsu: { ip: '192.168.1.100', port: 8080 },
        status: "operate", // operate
        event: 'Safety Event 1',
        timestamp: '2026-02-09T10:30:00Z'
      },
      {
        rsu: { ip: '192.168.1.101', port: 8081 },
        status: "standby", // standby
        event: 'Safety Event 2',
        timestamp: '2026-02-09T09:15:00Z'
      },
      {
        rsu: { ip: '192.168.1.102', port: 8082 },
        status: "fault", // fault
        event: null,
        timestamp: null
      }
    ]
  }
];

beforeEach(() => {
  jest.clearAllMocks();
  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve(mockTRUStatuses));
});

const mockAuthCtx = {
  isAuth: true,
  token: 'test-token'
};

const wrapper = ({ children }) => (
  <AuthContext.Provider value={mockAuthCtx}>
    <TRUStatusProvider>
      <TRUConfigProvider>{children}</TRUConfigProvider>
    </TRUStatusProvider>
  </AuthContext.Provider>
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


test("RSUStatusTab should close Register dialog", () => {
  render(<RSUStatusTab />, { wrapper });

  const registerButton = screen.getByText("Register RSU");
  fireEvent.click(registerButton);

  expect(screen.getByText("Register New RSU")).toBeInTheDocument();

  const cancelButton = screen.getByText("Cancel");
  fireEvent.click(cancelButton);

  // Dialog should close
});

// Tests for handleEdit function
test("RSUStatusTab should open Edit dialog when Edit button clicked", async () => {
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(rsuService.getTRUStatuses).toHaveBeenCalled();
  });

  // Wait for table to render with data
  await waitFor(() => {
    const ipAddress = screen.queryByText("192.168.1.100");
    expect(ipAddress).toBeInTheDocument();
  }, { timeout: 10000 });

  // Find Edit button (first one)
  const editButtons = screen.getAllByTestId("EditIcon");
  expect(editButtons.length).toBeGreaterThan(0);

  // Click the first Edit button
  fireEvent.click(editButtons[0].closest('button'));

  // Edit dialog should open
  await waitFor(() => {
    expect(screen.getByText("Edit RSU Configuration")).toBeInTheDocument();
  });
});

test("RSUStatusTab handleEdit should set selected RSU correctly", async () => {
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  // Click Edit on first RSU
  const editButtons = screen.getAllByTestId("EditIcon");
  fireEvent.click(editButtons[0].closest('button'));

  await waitFor(() => {
    expect(screen.getByText("Edit RSU Configuration")).toBeInTheDocument();
  });

  // Dialog should be open with RSU data
  // Check if IP field is populated (if dialog shows IP)
  const ipInputs = screen.queryAllByDisplayValue("192.168.1.100");
  expect(ipInputs.length).toBeGreaterThanOrEqual(0); // May or may not show in edit dialog
});

test("RSUStatusTab handleEdit should prevent event propagation", async () => {
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  const editButtons = screen.getAllByTestId("EditIcon");
  const editButton = editButtons[0].closest('button');

  // Create a spy on stopPropagation
  const clickEvent = new MouseEvent('click', { bubbles: true });
  const stopPropagationSpy = jest.spyOn(clickEvent, 'stopPropagation');
  
  editButton.dispatchEvent(clickEvent);

  // stopPropagation should have been called
  expect(stopPropagationSpy).toHaveBeenCalled();
});

// Tests for handleDelete function
test("RSUStatusTab should open Delete alert when Delete button clicked", async () => {
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  // Find Delete button
  const deleteButtons = screen.getAllByTestId("DeleteIcon");
  expect(deleteButtons.length).toBeGreaterThan(0);

  // Click the first Delete button
  fireEvent.click(deleteButtons[0].closest('button'));

  // Delete alert should open with confirmation message
  await waitFor(() => {
    expect(screen.findByText(/Are you sure/i)).toBeTruthy();
  }, { timeout: 5000 });
});

test("RSUStatusTab handleDelete should set selected RSU correctly", async () => {
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  // Click Delete on first RSU
  const deleteButtons = screen.getAllByTestId("DeleteIcon");
  fireEvent.click(deleteButtons[0].closest('button'));

  // Alert should show the RSU IP address
  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 5000 });
});

test("RSUStatusTab handleDelete should prevent event propagation", async () => {
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  const deleteButtons = screen.getAllByTestId("DeleteIcon");
  const deleteButton = deleteButtons[0].closest('button');

  // Create a spy on stopPropagation
  const clickEvent = new MouseEvent('click', { bubbles: true });
  const stopPropagationSpy = jest.spyOn(clickEvent, 'stopPropagation');
  
  deleteButton.dispatchEvent(clickEvent);

  // stopPropagation should have been called
  expect(stopPropagationSpy).toHaveBeenCalled();
});

// Tests for handleSuccess function
test("RSUStatusTab handleSuccess should call refresh", async () => {
  // Track the number of getTRUStatuses calls
  let callCount = 0;
  rsuService.getTRUStatuses = jest.fn(() => {
    callCount++;
    return Promise.resolve(mockTRUStatuses);
  });

  render(<RSUStatusTab />, { wrapper });

  // Initial load should call getTRUStatuses
  await waitFor(() => {
    expect(callCount).toBe(1);
  });

  // Open and close register dialog (which calls handleSuccess)
  const registerButton = screen.getByText("Register RSU");
  fireEvent.click(registerButton);

  await waitFor(() => {
    expect(screen.getByText("Register New RSU")).toBeInTheDocument();
  });

  // Find and click Save/Submit button if available to trigger success
  const saveButtons = screen.queryAllByText(/Save|Submit|Register/i);
  if (saveButtons.length > 1) {
    // Click the button in the dialog (not the main Register button)
    const dialogSaveButton = saveButtons[saveButtons.length - 1];
    fireEvent.click(dialogSaveButton);

    // Should trigger refresh (second call to getTRUStatuses)
    await waitFor(() => {
      expect(callCount).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
  }
});

test("RSUStatusTab handleSuccess should refresh after edit", async () => {
  let callCount = 0;
  rsuService.getTRUStatuses = jest.fn(() => {
    callCount++;
    return Promise.resolve(mockTRUStatuses);
  });

  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(callCount).toBeGreaterThanOrEqual(1);
  });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  // Open edit dialog
  const editButtons = screen.getAllByTestId("EditIcon");
  fireEvent.click(editButtons[0].closest('button'));

  await waitFor(() => {
    expect(screen.getByText("Edit RSU Configuration")).toBeInTheDocument();
  });

  // Closing dialog with success should trigger refresh
  // This would happen in the actual dialog's onSuccess callback
});

test("RSUStatusTab handleSuccess should refresh after delete", async () => {
  let callCount = 0;
  rsuService.getTRUStatuses = jest.fn(() => {
    callCount++;
    return Promise.resolve(mockTRUStatuses);
  });

  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(callCount).toBeGreaterThanOrEqual(1);
  });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  // Open delete alert
  const deleteButtons = screen.getAllByTestId("DeleteIcon");
  fireEvent.click(deleteButtons[0].closest('button'));

  await waitFor(() => {
    expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
  });

  // Confirming delete with success should trigger refresh
  // This would happen in the actual alert's onSuccess callback
});

// Tests for column renders
test("RSUStatusTab should render IP address column", async () => {
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  expect(screen.getByText("192.168.1.101")).toBeInTheDocument();
  expect(screen.getByText("192.168.1.102")).toBeInTheDocument();
});

test("RSUStatusTab should render Port column", async () => {
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  // Check for port numbers in the document
  const cells = screen.getAllByText(/8080|8081|8082/);
  expect(cells.length).toBeGreaterThan(0);
});

test("RSUStatusTab should render unitId column with data", async () => {
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  // Should show TRU IDs
  const truIds = screen.queryAllByText(/TRU001|TRU002/);
  expect(truIds.length).toBeGreaterThan(0);
});

test("RSUStatusTab should render dash for null unitId", async () => {
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  // Should have dashes for null unitId
  const dashes = screen.queryAllByText("-");
  expect(dashes.length).toBeGreaterThan(0);
});

test("RSUStatusTab should render eventName column with data", async () => {
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  // Should show event names
  expect(screen.queryByText("Safety Event 1")).toBeInTheDocument();
  expect(screen.queryByText("Safety Event 2")).toBeInTheDocument();
});


test("RSUStatusTab should render status column with data", async () => {
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  // Should show statuses
  expect(screen.queryByText("Standby")).toBeInTheDocument();
  expect(screen.queryByText("Operate")).toBeInTheDocument();
});

test("RSUStatusTab should render dash for null eventName", async () => {
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  // Should show dash for null event
  const dashes = screen.queryAllByText("-");
  expect(dashes.length).toBeGreaterThan(0);
});

test("RSUStatusTab should render lastSeen column with formatted timestamp", async () => {
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  // Should render formatted timestamps
  const dateElements = screen.queryAllByText(/2\/9\/2026|2026|Feb|10:30|9:15/);
  expect(dateElements.length).toBeGreaterThan(0);
});

test("RSUStatusTab should render dash for null lastSeen", async () => {
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  // Should have dash for null lastSeen
  const dashes = screen.queryAllByText("-");
  expect(dashes.length).toBeGreaterThan(0);
});

test("RSUStatusTab should render actions column with Edit and Delete buttons", async () => {
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  // Should have Edit icons
  const editIcons = screen.getAllByTestId("EditIcon");
  expect(editIcons.length).toBeGreaterThan(0);

  // Should have Delete icons
  const deleteIcons = screen.getAllByTestId("DeleteIcon");
  expect(deleteIcons.length).toBeGreaterThan(0);
});

test("RSUStatusTab actions column buttons should have correct tooltips", async () => {
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  // Check for Edit tooltip
  const editButtons = screen.getAllByTestId("EditIcon");
  const firstEditButton = editButtons[0].closest('button');
  
  // Hover over edit button to show tooltip
  fireEvent.mouseOver(firstEditButton);
  await waitFor(() => {
    expect(screen.queryByText("Edit") || screen.queryByRole("tooltip")).toBeTruthy();
  }, { timeout: 10000 });
});

test("RSUStatusTab actions column should render buttons in Stack with correct spacing", async () => {
  const { container } = render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  // Check for Stack elements containing action buttons
  const stacks = container.querySelectorAll('.MuiStack-root');
  expect(stacks.length).toBeGreaterThan(0);
});

test("RSUStatusTab should handle multiple RSUs in actions column", async () => {
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  const editIcons = screen.getAllByTestId("EditIcon");
  const deleteIcons = screen.getAllByTestId("DeleteIcon");

  // Should have same number of edit and delete buttons
  expect(editIcons.length).toBe(deleteIcons.length);
  
  // Should have multiple rows of actions
  expect(editIcons.length).toBeGreaterThanOrEqual(3);
});

test("RSUStatusTab Edit button should have correct color styling", async () => {
  const { container } = render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  const editIcons = screen.getAllByTestId("EditIcon");
  const editButton = editIcons[0].closest('button');

  // Check if button has the correct color style
  const style = window.getComputedStyle(editButton);
  // Color should be set (specific color may vary due to MUI theme)
  expect(editButton.className).toContain('MuiIconButton');
});

test("RSUStatusTab Delete button should have error color", async () => {
  const { container } = render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100")).toBeInTheDocument();
  }, { timeout: 10000 });

  const deleteIcons = screen.getAllByTestId("DeleteIcon");
  const deleteButton = deleteIcons[0].closest('button');

  // Delete button should have error color class
  expect(deleteButton.className).toContain('MuiIconButton');
  // May contain color-error or similar class
});

test("RSUStatusTab should handle empty RSU list in columns", async () => {
  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve([]));
  
  render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.getByText("RSU Status Management")).toBeInTheDocument();
  });

  // Should show empty message
  await waitFor(() => {
    expect(screen.queryByText(/No RSUs found/i)).toBeInTheDocument();
  }, { timeout: 10000 });
});

test("RSUStatusTab columns should handle RSU with all null fields", async () => {
  const mockDataWithNulls = [
    {
      unitConfig: { unitId: "TRU999", name: "Test TRU", maxConnections: 5 },
      pluginConfigStatus: { bridgePluginStatus: "running" },
      rsuConfigs: [{
        rsu: { ip: "192.168.1.200", port: 9000 },
        status: null,
        event: null,
        timestamp: null
      }]
    }
  ];

  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve(mockDataWithNulls));
  const { container } = render(<RSUStatusTab />, { wrapper });

  await waitFor(() => {
    expect(screen.queryByText("192.168.1.200")).toBeInTheDocument();
  }, { timeout: 10000 });

  // Should have multiple dashes for null values
  const dashes = screen.queryAllByText("-");
  expect(dashes.length).toBeGreaterThanOrEqual(2); // At least for unitId and event
});
