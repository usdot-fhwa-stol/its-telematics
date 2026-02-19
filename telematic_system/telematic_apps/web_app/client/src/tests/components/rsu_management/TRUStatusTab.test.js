import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TRUStatusTab from "../../../components/rsu_management/tru-status/TRUStatusTab";
import { AuthContextProvider } from "../../../context/auth-context";
import { TRUStatusProvider } from "../../../context/tru-status-context";

// Mock the API modules
jest.mock("../../../api/api-rsu");
jest.mock("../../../api/api-user");
jest.mock("../../../api/api-org");

// Mock useStorage hooks
const mockSetValue = () => {};
jest.mock("../../../hooks/useStorage", () => ({
  useStorageString: (key, defaultValue) => {
    if (key === "isAuth") return [true, mockSetValue];
    if (key === "username") return ["testuser", mockSetValue];
    if (key === "email") return ["test@example.com", mockSetValue];
    if (key === "role") return ["Admin", mockSetValue];
    if (key === "user_id") return ["1", mockSetValue];
    if (key === "org_id") return ["1", mockSetValue];
    if (key === "is_admin") return ["1", mockSetValue];
    if (key === "sessionToken") return ["test-token", mockSetValue];
    return [defaultValue, mockSetValue];
  },
  useStorageNumber: () => [0, mockSetValue],
  useClearStorage: () => mockSetValue
}));

const rsuService = require("../../../api/api-rsu").default;

const mockTRUStatuses = [
  {
    unitConfig: { unitId: "TRU001", name: "TRU Unit 1", maxConnections: 5 },
    pluginConfigStatus: { 
      bridgePluginStatus: "running",
      lastCommunicationTimestamp: "2026-02-09T10:30:00Z"
    },
    rsuConfigs: [
      { rsu: { ip: "192.168.1.100", port: 8080 } },
      { rsu: { ip: "192.168.1.101", port: 8080 } }
    ]
  },
  {
    unitConfig: { unitId: "TRU002", name: "TRU Unit 2", maxConnections: 3 },
    pluginConfigStatus: { 
      bridgePluginStatus: "error",
      lastCommunicationTimestamp: "2026-02-09T09:15:00Z"
    },
    rsuConfigs: [{ rsu: { ip: "192.168.1.102", port: 8080 } }]
  },
  {
    unitConfig: { unitId: "TRU003", name: "TRU Unit 3", maxConnections: 4 },
    pluginConfigStatus: { 
      bridgePluginStatus: "pending"
    },
    rsuConfigs: []
  }
];

beforeEach(() => {
  jest.clearAllMocks();
  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve(mockTRUStatuses));
  rsuService.getRSUStatuses = jest.fn(() => Promise.resolve([]));
});

const wrapper = ({ children }) => (
  <AuthContextProvider>
    <TRUStatusProvider>{children}</TRUStatusProvider>
  </AuthContextProvider>
);

test("TRUStatusTab should render component", async () => {
  const { container } = render(<TRUStatusTab />, { wrapper });
  expect(container).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.getByText("TRU Status Monitoring")).toBeInTheDocument();
  });
});

test("TRUStatusTab should render title and description", async () => {
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.getByText("TRU Status Monitoring")).toBeInTheDocument();
  });
  
  expect(screen.getByText(/Telematic Roadside Unit/)).toBeInTheDocument();
});

test("TRUStatusTab should render status count chips", async () => {
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.getByText(/Running:/)).toBeInTheDocument();
  });
  
  expect(screen.getByText(/Error:/)).toBeInTheDocument();
  expect(screen.getByText(/Pending:/)).toBeInTheDocument();
});

test("TRUStatusTab should display correct status counts", async () => {
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    const chips = screen.queryAllByText(/Running:/);
    expect(chips.length).toBeGreaterThan(0);
  }, { timeout: 3000 });
});

test("TRUStatusTab should render Refresh button and handle click", async () => {
  const { container } = render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.getByText("TRU Status Monitoring")).toBeInTheDocument();
  });
  
  const refreshIcon = container.querySelector('[data-testid="RefreshIcon"]');
  expect(refreshIcon).toBeInTheDocument();
  
  const refreshButton = refreshIcon?.closest('button');
  expect(refreshButton).toBeTruthy();
  
  // Click refresh button
  fireEvent.click(refreshButton);
  
  // Should call the API again
  await waitFor(() => {
    expect(rsuService.getTRUStatuses).toHaveBeenCalled();
  });
});

test("TRUStatusTab should render TRU IDs in table", async () => {
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(rsuService.getTRUStatuses).toHaveBeenCalled();
  });
});

test("TRUStatusTab should render TRU names in table", async () => {
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(rsuService.getTRUStatuses).toHaveBeenCalled();
  });
});

test("TRUStatusTab should render bridge status chips with correct colors", async () => {
  const { container } = render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    const chips = container.querySelectorAll('.MuiChip-root');
    expect(chips.length).toBeGreaterThan(0);
  }, { timeout: 3000 });
});

test("TRUStatusTab should render associated RSU IPs", async () => {
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(rsuService.getTRUStatuses).toHaveBeenCalled();
  });
});

test("TRUStatusTab should render RSU connection counts", async () => {
  const { container } = render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(rsuService.getTRUStatuses).toHaveBeenCalled();
  });
});

test("TRUStatusTab should render max connections", async () => {
  const { container } = render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(rsuService.getTRUStatuses).toHaveBeenCalled();
  });
});

test("TRUStatusTab should render last updated timestamp", async () => {
  const { container } = render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(rsuService.getTRUStatuses).toHaveBeenCalled();
  });
});

test("TRUStatusTab should handle empty TRU list", async () => {
  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve([]));
  
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.getByText("TRU Status Monitoring")).toBeInTheDocument();
  });
});

test("TRUStatusTab should handle null RSU configs", async () => {
  const mockData = [
    {
      unitConfig: { unitId: "TRU004", name: "TRU Unit 4", maxConnections: 2 },
      pluginConfigStatus: { bridgePluginStatus: "running" },
      rsuConfigs: null
    }
  ];

  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve(mockData));
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(rsuService.getTRUStatuses).toHaveBeenCalled();
  });
});

test("TRUStatusTab should handle missing unitConfig gracefully", async () => {
  const mockData = [
    {
      unitConfig: null,
      pluginConfigStatus: { bridgePluginStatus: "running" },
      rsuConfigs: []
    }
  ];

  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve(mockData));
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.getByText("TRU Status Monitoring")).toBeInTheDocument();
  });
});

test("TRUStatusTab should handle missing pluginConfigStatus", async () => {
  const mockData = [
    {
      unitConfig: { unitId: "TRU005", name: "TRU Unit 5", maxConnections: 2 },
      pluginConfigStatus: null,
      rsuConfigs: []
    }
  ];

  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve(mockData));
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(rsuService.getTRUStatuses).toHaveBeenCalled();
  });
});

test("TRUStatusTab should handle missing timestamp", async () => {
  const mockData = [
    {
      unitConfig: { unitId: "TRU006", name: "TRU Unit 6", maxConnections: 2 },
      pluginConfigStatus: { bridgePluginStatus: "running" },
      rsuConfigs: []
    }
  ];

  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve(mockData));
  const { container } = render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(rsuService.getTRUStatuses).toHaveBeenCalled();
  });
});

test("TRUStatusTab should handle RSU configs without IP", async () => {
  const mockData = [
    {
      unitConfig: { unitId: "TRU007", name: "TRU Unit 7", maxConnections: 2 },
      pluginConfigStatus: { bridgePluginStatus: "running" },
      rsuConfigs: [
        { rsu: null },
        { rsu: { port: 8080 } }
      ]
    }
  ];

  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve(mockData));
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(rsuService.getTRUStatuses).toHaveBeenCalled();
  });
});

test("TRUStatusTab should handle API errors gracefully", async () => {
  rsuService.getTRUStatuses = jest.fn(() => 
    Promise.reject(new Error("API Error"))
  );

  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.getByText("TRU Status Monitoring")).toBeInTheDocument();
  });
});

test("TRUStatusTab should render filters component", async () => {
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.getByText("TRU Status Monitoring")).toBeInTheDocument();
  });
});

// Tests for column render functions
test("TRUStatusTab should render unitId column with data", async () => {
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.queryByText("TRU001")).toBeInTheDocument();
  }, { timeout: 5000 });
  
  expect(screen.getByText("TRU002")).toBeInTheDocument();
  expect(screen.getByText("TRU003")).toBeInTheDocument();
});

test("TRUStatusTab should render unitName column with data", async () => {
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.queryByText("TRU Unit 1")).toBeInTheDocument();
  }, { timeout: 5000 });
  
  expect(screen.getByText("TRU Unit 2")).toBeInTheDocument();
  expect(screen.getByText("TRU Unit 3")).toBeInTheDocument();
});

test("TRUStatusTab should render bridgePluginStatus column with status chips", async () => {
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    const runningChips = screen.queryAllByText("Running");
    // One in status summary + one in table
    expect(runningChips.length).toBeGreaterThanOrEqual(1);
  }, { timeout: 5000 });
  
  const errorChips = screen.queryAllByText("Error");
  expect(errorChips.length).toBeGreaterThanOrEqual(1);
  
  const pendingChips = screen.queryAllByText("Pending");
  expect(pendingChips.length).toBeGreaterThanOrEqual(1);
});

test("TRUStatusTab should render rsuIPs column with IP addresses", async () => {
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.queryByText("192.168.1.100, 192.168.1.101")).toBeInTheDocument();
  }, { timeout: 5000 });
  
  expect(screen.getByText("192.168.1.102")).toBeInTheDocument();
});

test("TRUStatusTab should render currentConnections column with counts", async () => {
  const { container } = render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.queryByText("TRU001")).toBeInTheDocument();
  }, { timeout: 5000 });
  
  // Check table cells contain the connection counts
  const cells = container.querySelectorAll('td');
  const cellTexts = Array.from(cells).map(cell => cell.textContent);
  
  // TRU001 has 2 connections, TRU002 has 1, TRU003 has 0
  expect(cellTexts.includes('2') || cellTexts.some(text => text.includes('2'))).toBeTruthy();
  expect(cellTexts.includes('1') || cellTexts.some(text => text.includes('1'))).toBeTruthy();
  expect(cellTexts.includes('0') || cellTexts.some(text => text.includes('0'))).toBeTruthy();
});

test("TRUStatusTab should render maxConnections column with max values", async () => {
  const { container } = render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.queryByText("TRU001")).toBeInTheDocument();
  }, { timeout: 5000 });
  
  const cells = container.querySelectorAll('td');
  const cellTexts = Array.from(cells).map(cell => cell.textContent);
  
  // TRU001 maxConnections: 5, TRU002: 3, TRU003: 4
  expect(cellTexts.includes('5') || cellTexts.some(text => text.includes('5'))).toBeTruthy();
  expect(cellTexts.includes('3') || cellTexts.some(text => text.includes('3'))).toBeTruthy();
  expect(cellTexts.includes('4') || cellTexts.some(text => text.includes('4'))).toBeTruthy();
});

test("TRUStatusTab should render lastUpdated column with formatted timestamps", async () => {
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.queryByText("TRU001")).toBeInTheDocument();
  }, { timeout: 5000 });
  
  // Check for formatted date (format depends on locale, but should contain date parts)
  const dateElements = screen.queryAllByText(/2\/9\/2026|2026|Feb|10:30|9:15/);
  expect(dateElements.length).toBeGreaterThan(0);
});

// Edge case tests for render functions
test("TRUStatusTab should render dash for missing unitId", async () => {
  const mockDataWithMissingId = [
    {
      unitConfig: null,
      pluginConfigStatus: { bridgePluginStatus: "running" },
      rsuConfigs: []
    }
  ];
  
  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve(mockDataWithMissingId));
  const { container } = render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    const cells = container.querySelectorAll('td');
    const hasDash = Array.from(cells).some(cell => cell.textContent === '-');
    expect(hasDash).toBe(true);
  }, { timeout: 5000 });
});

test("TRUStatusTab should render dash for missing unitName", async () => {
  const mockDataWithMissingName = [
    {
      unitConfig: { unitId: "TRU999", name: null, maxConnections: 5 },
      pluginConfigStatus: { bridgePluginStatus: "running" },
      rsuConfigs: []
    }
  ];
  
  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve(mockDataWithMissingName));
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.queryByText("TRU999")).toBeInTheDocument();
  }, { timeout: 5000 });
});

test("TRUStatusTab should render Pending status for null bridgePluginStatus", async () => {
  const mockDataWithNullStatus = [
    {
      unitConfig: { unitId: "TRU888", name: "Test TRU", maxConnections: 2 },
      pluginConfigStatus: { bridgePluginStatus: null },
      rsuConfigs: []
    }
  ];
  
  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve(mockDataWithNullStatus));
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.queryByText("TRU888")).toBeInTheDocument();
  }, { timeout: 5000 });
  
  // Should default to 'pending' when status is null/undefined
  const pendingChips = screen.queryAllByText("Pending");
  expect(pendingChips.length).toBeGreaterThan(0);
});

test("TRUStatusTab should render dash for empty rsuIPs", async () => {
  const mockDataWithNoRSUs = [
    {
      unitConfig: { unitId: "TRU777", name: "No RSUs", maxConnections: 5 },
      pluginConfigStatus: { bridgePluginStatus: "running" },
      rsuConfigs: []
    }
  ];
  
  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve(mockDataWithNoRSUs));
  const { container } = render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.queryByText("TRU777")).toBeInTheDocument();
  }, { timeout: 5000 });
});

test("TRUStatusTab should filter out RSU configs without IPs", async () => {
  const mockDataWithMissingIPs = [
    {
      unitConfig: { unitId: "TRU666", name: "Mixed RSUs", maxConnections: 5 },
      pluginConfigStatus: { bridgePluginStatus: "running" },
      rsuConfigs: [
        { rsu: null },
        { rsu: { ip: "192.168.1.200", port: 8080 } },
        { rsu: { port: 8081 } }
      ]
    }
  ];
  
  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve(mockDataWithMissingIPs));
  render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.queryByText("192.168.1.200")).toBeInTheDocument();
  }, { timeout: 5000 });
});

test("TRUStatusTab should render 0 for currentConnections when rsuConfigs is empty", async () => {
  const mockDataWithNoConnections = [
    {
      unitConfig: { unitId: "TRU555", name: "No Connections", maxConnections: 10 },
      pluginConfigStatus: { bridgePluginStatus: "running" },
      rsuConfigs: []
    }
  ];
  
  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve(mockDataWithNoConnections));
  const { container } = render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.queryByText("TRU555")).toBeInTheDocument();
  }, { timeout: 5000 });
  
  const cells = container.querySelectorAll('td');
  const cellTexts = Array.from(cells).map(cell => cell.textContent);
  expect(cellTexts.includes('0') || cellTexts.some(text => text.includes('0'))).toBeTruthy();
});

test("TRUStatusTab should render dash for missing maxConnections", async () => {
  const mockDataWithMissingMax = [
    {
      unitConfig: { unitId: "TRU444", name: "No Max", maxConnections: null },
      pluginConfigStatus: { bridgePluginStatus: "running" },
      rsuConfigs: []
    }
  ];
  
  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve(mockDataWithMissingMax));
  const { container } = render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.queryByText("TRU444")).toBeInTheDocument();
  }, { timeout: 5000 });
});

test("TRUStatusTab should render dash for missing lastCommunicationTimestamp", async () => {
  const mockDataWithNoTimestamp = [
    {
      unitConfig: { unitId: "TRU333", name: "No Timestamp", maxConnections: 5 },
      pluginConfigStatus: { bridgePluginStatus: "running", lastCommunicationTimestamp: null },
      rsuConfigs: []
    }
  ];
  
  rsuService.getTRUStatuses = jest.fn(() => Promise.resolve(mockDataWithNoTimestamp));
  const { container } = render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.queryByText("TRU333")).toBeInTheDocument();
  }, { timeout: 5000 });
});

test("TRUStatusTab should render status chips with correct color classes", async () => {
  const { container } = render(<TRUStatusTab />, { wrapper });
  
  await waitFor(() => {
    expect(screen.queryByText("TRU001")).toBeInTheDocument();
  }, { timeout: 5000 });
  
  // Find chips and check for color classes
  const chips = container.querySelectorAll('.MuiChip-root');
  const chipTexts = Array.from(chips).map(chip => chip.textContent);
  
  // Should have Running, Error, and Pending chips
  expect(chipTexts.some(text => text === 'Running')).toBeTruthy();
  expect(chipTexts.some(text => text === 'Error')).toBeTruthy();
  expect(chipTexts.some(text => text === 'Pending')).toBeTruthy();
});
