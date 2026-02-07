import { expect, jest, test } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as rsuService from "../../api/api-rsu";
import AuthContext from "../../context/auth-context";
import { TRUStatusProvider, useTRUStatus } from "../../context/tru-status-context";

// Mock the API service
jest.mock("../../api/api-rsu");

const mockAuthContext = {
  user_id: 1,
  isAuth: "true",
  username: "test",
  email: "test@telematic.com",
  sessionToken: "token",
  org_id: "1",
  name: "Test User",
  role: "Admin"
};

const wrapper = ({ children }) => (
  <AuthContext.Provider value={mockAuthContext}>
    <TRUStatusProvider>{children}</TRUStatusProvider>
  </AuthContext.Provider>
);

const mockTRUStatuses = [
  {
    unitConfig: {
      unitId: 'TRU-001',
      name: 'Test TRU 1',
      maxConnections: 5,
      pluginHeartbeatInterval: 30,
      healthMonitorPluginHeartbeatInterval: 60,
      rsuStatusMonitorInterval: 30,
      timestamp: 1706745600000,
      lastUpdatedTimestamp: 1706745600000
    },
    pluginConfigStatus: {
      bridgePluginStatus: 'running',
      lastCommunicationTimestamp: 1706745600000,
      timestamp: 1706745600000
    },
    rsuConfigs: [
      {
        rsu: { ip: '192.168.1.100', port: 1516 },
        status: 3,
        timestamp: 1706745600000
      }
    ],
    timestamp: 1706745600000
  }
];

beforeEach(() => {
  jest.clearAllMocks();
  rsuService.default = {
    getTRUStatuses: jest.fn().mockResolvedValue(mockTRUStatuses),
    assignRSU: jest.fn().mockResolvedValue({}),
    updateRSUConfig: jest.fn().mockResolvedValue({}),
    removeRSU: jest.fn().mockResolvedValue({})
  };
});

test("useTRUStatus should provide initial state", async () => {
  const { result } = renderHook(() => useTRUStatus(), { wrapper });

  // When authenticated, context automatically fetches data, so loading starts as true
  expect(result.current.truStatuses).toEqual([]);
  expect(result.current.loading).toBe(true);
  expect(result.current.error).toBeNull();
  
  // Wait for the fetch to complete
  await waitFor(() => expect(result.current.loading).toBe(false));
});

test("useTRUStatus should fetch TRU statuses", async () => {
  const { result } = renderHook(() => useTRUStatus(), { wrapper });

  await act(async () => {
    await result.current.fetchTRUStatuses();
  });

  await waitFor(() => {
    expect(result.current.truStatuses).toHaveLength(1);
    expect(result.current.truStatuses[0].unitConfig.unitId).toBe('TRU-001');
  });
});

test("useTRUStatus should handle fetch errors", async () => {
  rsuService.default.getTRUStatuses.mockRejectedValue(new Error('Network error'));

  const { result } = renderHook(() => useTRUStatus(), { wrapper });

  await act(async () => {
    await result.current.fetchTRUStatuses();
  });

  await waitFor(() => {
    expect(result.current.error).toBeTruthy();
  });
});

test("useTRUStatus should normalize TRU data", async () => {
  const { result } = renderHook(() => useTRUStatus(), { wrapper });

  await act(async () => {
    await result.current.fetchTRUStatuses();
  });

  await waitFor(() => {
    const tru = result.current.truStatuses[0];
    expect(tru.unitConfig).toBeDefined();
    expect(tru.pluginConfigStatus).toBeDefined();
    expect(tru.rsuConfigs).toBeDefined();
  });
});

test("useTRUStatus should extract RSU statuses", async () => {
  const { result } = renderHook(() => useTRUStatus(), { wrapper });

  await act(async () => {
    await result.current.fetchTRUStatuses();
  });

  await waitFor(() => {
    expect(result.current.rsuStatuses).toHaveLength(1);
    expect(result.current.rsuStatuses[0].ip).toBe('192.168.1.100');
  });
});

test("useTRUStatus should convert RSU mode status", async () => {
  const { result } = renderHook(() => useTRUStatus(), { wrapper });

  await act(async () => {
    await result.current.fetchTRUStatuses();
  });

  await waitFor(() => {
    expect(result.current.rsuStatuses[0].status).toBe('operate');
  });
});

test("useTRUStatus should apply TRU filters", async () => {
  const { result } = renderHook(() => useTRUStatus(), { wrapper });

  await act(async () => {
    await result.current.fetchTRUStatuses();
  });

  await act(async () => {
    result.current.updateFilters({ search: 'TRU-001', status: 'all' });
  });

  await waitFor(() => {
    expect(result.current.filteredStatuses).toHaveLength(1);
  });
});

test("useTRUStatus should filter by search term", async () => {
  const { result } = renderHook(() => useTRUStatus(), { wrapper });

  await act(async () => {
    await result.current.fetchTRUStatuses();
  });

  await act(async () => {
    result.current.updateFilters({ search: 'nonexistent', status: 'all' });
  });

  await waitFor(() => {
    expect(result.current.filteredStatuses).toHaveLength(0);
  });
});

test("useTRUStatus should apply RSU filters", async () => {
  const { result } = renderHook(() => useTRUStatus(), { wrapper });

  await act(async () => {
    await result.current.fetchTRUStatuses();
  });

  await act(async () => {
    result.current.updateRSUFilters({ search: '192.168', status: 'all' });
  });

  await waitFor(() => {
    expect(result.current.filteredRSUStatuses).toHaveLength(1);
  });
});

test("useTRUStatus should filter RSUs by status", async () => {
  const { result } = renderHook(() => useTRUStatus(), { wrapper });

  await act(async () => {
    await result.current.fetchTRUStatuses();
  });

  await act(async () => {
    result.current.updateRSUFilters({ search: '', status: 'operate' });
  });

  await waitFor(() => {
    expect(result.current.filteredRSUStatuses).toHaveLength(1);
  });
});

test("useTRUStatus should handle empty response", async () => {
  rsuService.default.getTRUStatuses.mockResolvedValue([]);

  const { result } = renderHook(() => useTRUStatus(), { wrapper });

  await act(async () => {
    await result.current.fetchTRUStatuses();
  });

  await waitFor(() => {
    expect(result.current.truStatuses).toEqual([]);
  });
});

test("useTRUStatus should update lastUpdated timestamp", async () => {
  const { result } = renderHook(() => useTRUStatus(), { wrapper });

  await act(async () => {
    await result.current.fetchTRUStatuses();
  });

  await waitFor(() => {
    expect(result.current.lastUpdated).toBeTruthy();
  });
});
