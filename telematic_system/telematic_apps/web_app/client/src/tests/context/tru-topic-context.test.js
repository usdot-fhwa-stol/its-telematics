import { expect, jest, test } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as rsuService from "../../api/api-rsu";
import AuthContext from "../../context/auth-context";
import { TRUStatusProvider } from "../../context/tru-status-context";
import { TRUTopicsProvider, useTRUTopics } from "../../context/tru-topic-context";

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

const mockTRUStatuses = [
  {
    unitConfig: {
      unitId: 'TRU-001',
      name: 'Test TRU 1'
    },
    rsuConfigs: [
      {
        rsu: { ip: '192.168.1.100', port: 1516 },
        status: 'operate'
      }
    ]
  }
];

const mockAvailableTopics = {
  unitId: 'TRU-001',
  rsuTopics: [
    {
      rsu: { ip: '192.168.1.100', port: 1516 },
      topics: ['bsm', 'tim', 'spat', 'map']
    }
  ]
};

const wrapper = ({ children }) => (
  <AuthContext.Provider value={mockAuthContext}>
    <TRUStatusProvider>
      <TRUTopicsProvider>{children}</TRUTopicsProvider>
    </TRUStatusProvider>
  </AuthContext.Provider>
);

beforeEach(() => {
  jest.clearAllMocks();
  rsuService.default = {
    getTRUStatuses: jest.fn().mockResolvedValue(mockTRUStatuses),
    getAvailableTopics: jest.fn().mockResolvedValue(mockAvailableTopics),
    confirmDataSelection: jest.fn().mockResolvedValue({})
  };
});

test("useTRUTopics should provide initial state", () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  expect(result.current.truTopics).toEqual([]);
  expect(result.current.selectedTRU).toBeNull();
  expect(result.current.selectedRSUs).toEqual([]);
  expect(result.current.loading).toBe(false);
});

test("useTRUTopics should select TRU", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  await act(async () => {
    result.current.selectTRU('TRU-001');
  });

  expect(result.current.selectedTRU).toBe('TRU-001');
});

test("useTRUTopics should select RSUs", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  await act(async () => {
    result.current.selectRSUs(['192.168.1.100:1516']);
  });

  expect(result.current.selectedRSUs).toEqual(['192.168.1.100:1516']);
});

test("useTRUTopics should fetch TRU topics by ID", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  let topics;
  await act(async () => {
    topics = await result.current.fetchTRUTopicsById('TRU-001');
  });

  expect(topics).toEqual(mockAvailableTopics);
  expect(rsuService.default.getAvailableTopics).toHaveBeenCalledWith(
    expect.objectContaining({
      unitId: 'TRU-001',
      rsuTopics: []
    })
  );
});

test("useTRUTopics should handle fetch errors", async () => {
  rsuService.default.getAvailableTopics.mockRejectedValue(new Error('Network error'));

  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  await act(async () => {
    try {
      await result.current.fetchTRUTopicsById('TRU-001');
    } catch (err) {
      expect(err.message).toBe('Network error');
    }
  });

  await waitFor(() => {
    expect(result.current.error).toBeTruthy();
  });
});

test("useTRUTopics should update TRU topics", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  const topicsData = {
    unitId: 'TRU-001',
    rsuTopics: [
      {
        rsu: { ip: '192.168.1.100', port: 1516 },
        topics: ['bsm', 'tim']
      }
    ]
  };

  await act(async () => {
    await result.current.updateTRUTopics('TRU-001', topicsData);
  });

  expect(rsuService.default.confirmDataSelection).toHaveBeenCalledWith(topicsData);
});

test("useTRUTopics should toggle topic selection", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  await act(async () => {
    result.current.toggleTopic('192.168.1.100:1516', 'bsm');
  });

  expect(result.current.selectedTopics['192.168.1.100:1516']).toContain('bsm');
});

test("useTRUTopics should remove topic from selection", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  await act(async () => {
    result.current.toggleTopic('192.168.1.100:1516', 'bsm');
  });

  await act(async () => {
    result.current.toggleTopic('192.168.1.100:1516', 'bsm');
  });

  const topics = result.current.selectedTopics['192.168.1.100:1516'] || [];
  expect(topics).not.toContain('bsm');
});

test("useTRUTopics should set data type filter", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  await act(async () => {
    result.current.handleDataTypeFilterChange(['bsm', 'tim']);
  });

  expect(result.current.dataTypeFilter).toEqual(['bsm', 'tim']);
});

test("useTRUTopics should filter topics by RSU", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  // First fetch TRU topics to populate data
  await act(async () => {
    await result.current.fetchTRUTopicsById('TRU-001');
  });

  // Then apply data type filter
  await act(async () => {
    result.current.handleDataTypeFilterChange(['bsm']);
  });

  await waitFor(() => {
    expect(result.current.filteredTopicsByRSU).toBeDefined();
  });
});

test("useTRUTopics should reset selection", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  await act(async () => {
    result.current.selectTRU('TRU-001');
    result.current.selectRSUs(['192.168.1.100:1516']);
    result.current.toggleTopic('bsm', '192.168.1.100:1516');
  });

  await act(async () => {
    result.current.resetSelection();
  });

  expect(result.current.selectedTRU).toBeNull();
  expect(result.current.selectedRSUs).toEqual([]);
  expect(result.current.selectedTopics).toEqual({});
});

test("useTRUTopics should handle dataTypeFilter 'all'", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  await act(async () => {
    result.current.handleDataTypeFilterChange(['all']);
  });

  expect(result.current.dataTypeFilter).toEqual(['all']);
});

test("useTRUTopics should clear selected topics for RSU", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  await act(async () => {
    result.current.toggleTopic('192.168.1.100:1516', 'bsm');
    result.current.toggleTopic('192.168.1.100:1516', 'tim');
  });

  await act(async () => {
    result.current.clearTopicsForRSUs(['192.168.1.100:1516']);
  });

  expect(result.current.selectedTopics['192.168.1.100:1516']).toBeUndefined();
});

test("useTRUTopics should select all topics for RSU", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  const allTopics = { '192.168.1.100:1516': ['bsm', 'tim', 'spat', 'map'] };

  await act(async () => {
    result.current.selectAllTopics(allTopics);
  });

  expect(result.current.selectedTopics['192.168.1.100:1516']).toEqual(['bsm', 'tim', 'spat', 'map']);
});
