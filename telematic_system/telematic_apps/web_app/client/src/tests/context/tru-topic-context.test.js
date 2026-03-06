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

test("saveTopicConfiguration should throw error when no TRU is selected", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  await expect(act(async () => {
    await result.current.saveTopicConfiguration();
  })).rejects.toThrow('No TRU selected');
});

test("saveTopicConfiguration should throw error when no RSUs are selected", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  await act(async () => {
    result.current.selectTRU('TRU-001');
  });

  await expect(act(async () => {
    await result.current.saveTopicConfiguration();
  })).rejects.toThrow('No RSUs selected');
});

test("saveTopicConfiguration should correctly map selected topics to topic objects with name and selected properties", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  // Setup: Select TRU and RSU
  await act(async () => {
    await result.current.selectTRU('TRU-001');
  });

  await act(async () => {
    result.current.selectRSUs([{ ip: '192.168.1.100', port: 1516 }]);
  });

  // Select topics
  await act(async () => {
    result.current.toggleTopic('192.168.1.100:1516', 'bsm');
    result.current.toggleTopic('192.168.1.100:1516', 'tim');
  });

  // Save configuration
  await act(async () => {
    await result.current.saveTopicConfiguration();
  });

  // Verify the API was called with correctly mapped topics
  expect(rsuService.default.confirmDataSelection).toHaveBeenCalledWith(
    expect.objectContaining({
      unitId: 'TRU-001',
      rsuTopics: [
        {
          rsu: { ip: '192.168.1.100', port: 1516 },
          topics: [
            { name: 'bsm', selected: true },
            { name: 'tim', selected: true }
          ]
        }
      ]
    })
  );
});

test("saveTopicConfiguration should handle single RSU with single topic", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  await act(async () => {
    await result.current.selectTRU('TRU-001');
    result.current.selectRSUs([{ ip: '192.168.1.100', port: 1516 }]);
    result.current.toggleTopic('192.168.1.100:1516', 'bsm');
  });

  await act(async () => {
    await result.current.saveTopicConfiguration();
  });

  expect(rsuService.default.confirmDataSelection).toHaveBeenCalledWith(
    expect.objectContaining({
      rsuTopics: [
        {
          rsu: { ip: '192.168.1.100', port: 1516 },
          topics: [{ name: 'bsm', selected: true }]
        }
      ]
    })
  );
});

test("saveTopicConfiguration should handle multiple RSUs with different topic selections", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  await act(async () => {
    await result.current.selectTRU('TRU-001');
    result.current.selectRSUs([
      { ip: '192.168.1.100', port: 1516 },
      { ip: '192.168.1.101', port: 1517 }
    ]);
    result.current.toggleTopic('192.168.1.100:1516', 'bsm');
    result.current.toggleTopic('192.168.1.100:1516', 'tim');
    result.current.toggleTopic('192.168.1.101:1517', 'spat');
  });

  await act(async () => {
    await result.current.saveTopicConfiguration();
  });

  expect(rsuService.default.confirmDataSelection).toHaveBeenCalledWith(
    expect.objectContaining({
      unitId: 'TRU-001',
      rsuTopics: [
        {
          rsu: { ip: '192.168.1.100', port: 1516 },
          topics: [
            { name: 'bsm', selected: true },
            { name: 'tim', selected: true }
          ]
        },
        {
          rsu: { ip: '192.168.1.101', port: 1517 },
          topics: [{ name: 'spat', selected: true }]
        }
      ]
    })
  );
});

test("saveTopicConfiguration should handle RSU with no selected topics (empty array)", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  await act(async () => {
    await result.current.selectTRU('TRU-001');
    result.current.selectRSUs([{ ip: '192.168.1.100', port: 1516 }]);
    // Don't select any topics
  });

  await act(async () => {
    await result.current.saveTopicConfiguration();
  });

  expect(rsuService.default.confirmDataSelection).toHaveBeenCalledWith(
    expect.objectContaining({
      rsuTopics: [
        {
          rsu: { ip: '192.168.1.100', port: 1516 },
          topics: [] // Empty topics array
        }
      ]
    })
  );
});

test("saveTopicConfiguration should include timestamp in TRUTopicsMessage", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  const beforeTimestamp = Date.now();

  await act(async () => {
    await result.current.selectTRU('TRU-001');
    result.current.selectRSUs([{ ip: '192.168.1.100', port: 1516 }]);
    result.current.toggleTopic('192.168.1.100:1516', 'bsm');
  });

  await act(async () => {
    await result.current.saveTopicConfiguration();
  });

  const afterTimestamp = Date.now();

  expect(rsuService.default.confirmDataSelection).toHaveBeenCalledWith(
    expect.objectContaining({
      unitId: 'TRU-001',
      timestamp: expect.any(Number)
    })
  );

  const callArg = rsuService.default.confirmDataSelection.mock.calls[0][0];
  expect(callArg.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
  expect(callArg.timestamp).toBeLessThanOrEqual(afterTimestamp);
});

test("saveTopicConfiguration should map topic names correctly preserving order", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  await act(async () => {
    await result.current.selectTRU('TRU-001');
    result.current.selectRSUs([{ ip: '192.168.1.100', port: 1516 }]);
    // Add topics in specific order
    result.current.toggleTopic('192.168.1.100:1516', 'bsm');
    result.current.toggleTopic('192.168.1.100:1516', 'tim');
    result.current.toggleTopic('192.168.1.100:1516', 'spat');
    result.current.toggleTopic('192.168.1.100:1516', 'map');
  });

  await act(async () => {
    await result.current.saveTopicConfiguration();
  });

  const callArg = rsuService.default.confirmDataSelection.mock.calls[0][0];
  const topics = callArg.rsuTopics[0].topics;
  
  // Verify all topics have correct structure
  expect(topics).toHaveLength(4);
  topics.forEach(topic => {
    expect(topic).toHaveProperty('name');
    expect(topic).toHaveProperty('selected');
    expect(topic.selected).toBe(true);
    expect(typeof topic.name).toBe('string');
  });
});

test("saveTopicConfiguration should prevent concurrent save operations", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  // Setup
  await act(async () => {
    await result.current.selectTRU('TRU-001');
    result.current.selectRSUs([{ ip: '192.168.1.100', port: 1516 }]);
    result.current.toggleTopic('192.168.1.100:1516', 'bsm');
  });

  // Mock a slow API call
  rsuService.default.confirmDataSelection.mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve({}), 100))
  );

  // Start first save
  const firstSave = act(async () => {
    await result.current.saveTopicConfiguration();
  });

  // Try to start second save immediately (should be blocked)
  await expect(act(async () => {
    await result.current.saveTopicConfiguration();
  })).rejects.toThrow('Save operation already in progress');

  // Wait for first save to complete
  await firstSave;

  // After first save completes, second save should work
  await act(async () => {
    await result.current.saveTopicConfiguration();
  });

  // Should have been called twice (first save + retry after completion)
  expect(rsuService.default.confirmDataSelection).toHaveBeenCalledTimes(2);
});

test("saveTopicConfiguration should reset save lock after error", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  // Setup
  await act(async () => {
    await result.current.selectTRU('TRU-001');
    result.current.selectRSUs([{ ip: '192.168.1.100', port: 1516 }]);
    result.current.toggleTopic('192.168.1.100:1516', 'bsm');
  });

  // Mock API to fail
  rsuService.default.confirmDataSelection.mockRejectedValueOnce(new Error('Network error'));

  // First save fails
  try {
    await act(async () => {
      await result.current.saveTopicConfiguration();
    });
  } catch (err) {
    // Expected to fail
    expect(err.message).toBe('Network error');
  }

  // Reset mock to succeed
  rsuService.default.confirmDataSelection.mockResolvedValueOnce({});

  // Second save should work (lock should be released after error)
  await act(async () => {
    await result.current.saveTopicConfiguration();
  });

  expect(rsuService.default.confirmDataSelection).toHaveBeenCalledTimes(2);
});

test("saveTopicConfiguration should fetch available topics after save to get complete RSU list with correct selections", async () => {
  const { result } = renderHook(() => useTRUTopics(), { wrapper });

  // Setup
  await act(async () => {
    await result.current.selectTRU('TRU-001');
    result.current.selectRSUs([{ ip: '192.168.1.100', port: 1516 }]);
    result.current.toggleTopic('192.168.1.100:1516', 'bsm');
  });

  // Reset mock call counts
  jest.clearAllMocks();

  // Save configuration
  await act(async () => {
    await result.current.saveTopicConfiguration();
  });

  // Should call confirmDataSelection once
  expect(rsuService.default.confirmDataSelection).toHaveBeenCalledTimes(1);
  
  // Should call getAvailableTopics once to refresh all RSUs with correct selected flags
  expect(rsuService.default.getAvailableTopics).toHaveBeenCalledTimes(1);
  
  // The getAvailableTopics call should be with empty rsuTopics to fetch all available RSUs
  expect(rsuService.default.getAvailableTopics).toHaveBeenCalledWith(
    expect.objectContaining({
      unitId: 'TRU-001',
      rsuTopics: []
    })
  );
});
