import { expect, jest, test } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as rsuService from "../../api/api-rsu";
import { TRUConfigProvider, useTRUConfig } from "../../context/tru-config-context";

// Mock the API service
jest.mock("../../api/api-rsu");

const wrapper = ({ children }) => <TRUConfigProvider>{children}</TRUConfigProvider>;

beforeEach(() => {
  jest.clearAllMocks();
  rsuService.default = {
    assignRSU: jest.fn().mockResolvedValue({ success: true }),
    updateRSUConfig: jest.fn().mockResolvedValue({ success: true }),
    removeRSU: jest.fn().mockResolvedValue({ success: true })
  };
});

test("useTRUConfig should provide initial state", () => {
  const { result } = renderHook(() => useTRUConfig(), { wrapper });

  expect(result.current.truConfigs).toEqual([]);
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBeNull();
  expect(result.current.lastUpdated).toBeNull();
});

test("useTRUConfig should throw error when used outside provider", () => {
  // Suppress console error for this test
  const originalError = console.error;
  console.error = jest.fn();

  expect(() => {
    renderHook(() => useTRUConfig());
  }).toThrow('useTRUConfig must be used within a TRUConfigProvider');

  console.error = originalError;
});

test("useTRUConfig should provide buildTruConfigMessage function", () => {
  const { result } = renderHook(() => useTRUConfig(), { wrapper });

  expect(typeof result.current.buildTruConfigMessage).toBe('function');
});

test("buildTruConfigMessage should build message with all fields", () => {
  const { result } = renderHook(() => useTRUConfig(), { wrapper });

  const message = result.current.buildTruConfigMessage(
    'TRU-001',
    'add',
    'register',
    { ip: '192.168.1.1', port: 8080 },
    { community: 'public', version: '2c' }
  );

  expect(message.unitConfig.unitId).toBe('TRU-001');
  expect(message.rsuConfigs).toHaveLength(1);
  expect(message.rsuConfigs[0].action).toBe('add');
  expect(message.rsuConfigs[0].event).toBe('register');
  expect(message.rsuConfigs[0].rsu.ip).toBe('192.168.1.1');
  expect(message.rsuConfigs[0].rsu.port).toBe(8080);
  expect(message.rsuConfigs[0].snmp.community).toBe('public');
  expect(message.timestamp).toBeDefined();
});

test("buildTruConfigMessage should build message without SNMP", () => {
  const { result } = renderHook(() => useTRUConfig(), { wrapper });

  const message = result.current.buildTruConfigMessage(
    'TRU-001',
    'remove',
    'delete',
    { ip: '192.168.1.1', port: 8080 },
    null
  );

  expect(message.rsuConfigs[0].snmp).toBeUndefined();
});

test("registerRSU should call assignRSU API with built message", async () => {
  const { result } = renderHook(() => useTRUConfig(), { wrapper });

  await act(async () => {
    await result.current.registerRSU({
      unitId: 'TRU-001',
      event: 'register',
      rsu: { ip: '192.168.1.1', port: 8080 },
      snmp: { community: 'public', version: '2c' }
    });
  });

  expect(rsuService.default.assignRSU).toHaveBeenCalledTimes(1);
  const callArg = rsuService.default.assignRSU.mock.calls[0][0];
  expect(callArg.unitConfig.unitId).toBe('TRU-001');
  expect(callArg.rsuConfigs[0].action).toBe('add');
});

test("registerRSU should accept pre-built TruConfigMessage", async () => {
  const { result } = renderHook(() => useTRUConfig(), { wrapper });

  const truConfigMessage = {
    unitConfig: { unitId: 'TRU-002' },
    rsuConfigs: [{
      action: 'add',
      event: 'register',
      rsu: { ip: '192.168.1.2', port: 8080 }
    }],
    timestamp: Date.now()
  };

  await act(async () => {
    await result.current.registerRSU(truConfigMessage);
  });

  expect(rsuService.default.assignRSU).toHaveBeenCalledWith(truConfigMessage);
});

test("registerRSU should handle errors", async () => {
  const { result } = renderHook(() => useTRUConfig(), { wrapper });
  const error = new Error('Registration failed');
  rsuService.default.assignRSU.mockRejectedValueOnce(error);

  await expect(async () => {
    await act(async () => {
      await result.current.registerRSU({
        unitId: 'TRU-001',
        event: 'register',
        rsu: { ip: '192.168.1.1', port: 8080 }
      });
    });
  }).rejects.toThrow('Registration failed');
});

test("updateRSU should call updateRSUConfig API", async () => {
  const { result } = renderHook(() => useTRUConfig(), { wrapper });

  await act(async () => {
    await result.current.updateRSU({
      unitId: 'TRU-001',
      event: 'update',
      rsu: { ip: '192.168.1.1', port: 8080 },
      snmp: { community: 'private', version: '3' }
    });
  });

  expect(rsuService.default.updateRSUConfig).toHaveBeenCalledTimes(1);
  const callArg = rsuService.default.updateRSUConfig.mock.calls[0][0];
  expect(callArg.unitConfig.unitId).toBe('TRU-001');
  expect(callArg.rsuConfigs[0].action).toBe('update');
});

test("updateRSU should accept pre-built TruConfigMessage", async () => {
  const { result } = renderHook(() => useTRUConfig(), { wrapper });

  const truConfigMessage = {
    unitConfig: { unitId: 'TRU-002' },
    rsuConfigs: [{
      action: 'update',
      event: 'modify',
      rsu: { ip: '192.168.1.2', port: 8080 }
    }],
    timestamp: Date.now()
  };

  await act(async () => {
    await result.current.updateRSU(truConfigMessage);
  });

  expect(rsuService.default.updateRSUConfig).toHaveBeenCalledWith(truConfigMessage);
});

test("updateRSU should handle errors", async () => {
  const { result } = renderHook(() => useTRUConfig(), { wrapper });
  const error = new Error('Update failed');
  rsuService.default.updateRSUConfig.mockRejectedValueOnce(error);

  await expect(async () => {
    await act(async () => {
      await result.current.updateRSU({
        unitId: 'TRU-001',
        event: 'update',
        rsu: { ip: '192.168.1.1', port: 8080 }
      });
    });
  }).rejects.toThrow('Update failed');
});

test("deleteRSU should call removeRSU API", async () => {
  const { result } = renderHook(() => useTRUConfig(), { wrapper });

  await act(async () => {
    await result.current.deleteRSU('192.168.1.1', 8080, 'TRU-001', 'startup');
  });

  expect(rsuService.default.removeRSU).toHaveBeenCalledTimes(1);
  const callArg = rsuService.default.removeRSU.mock.calls[0][0];
  expect(callArg.unitConfig.unitId).toBe('TRU-001');
  expect(callArg.rsuConfigs[0].action).toBe('remove');
  expect(callArg.rsuConfigs[0].event).toBe('startup');
  expect(callArg.rsuConfigs[0].rsu.ip).toBe('192.168.1.1');
  expect(callArg.rsuConfigs[0].rsu.port).toBe(8080);
  expect(callArg.rsuConfigs[0].snmp).toBeUndefined();
});

test("deleteRSU should handle errors", async () => {
  const { result } = renderHook(() => useTRUConfig(), { wrapper });
  const error = new Error('Delete failed');
  rsuService.default.removeRSU.mockRejectedValueOnce(error);

  await expect(async () => {
    await act(async () => {
      await result.current.deleteRSU('192.168.1.1', 8080, 'TRU-001');
    });
  }).rejects.toThrow('Delete failed');
});

test("registerRSU should set loading state", async () => {
  const { result } = renderHook(() => useTRUConfig(), { wrapper });

  const promise = act(async () => {
    await result.current.registerRSU({
      unitId: 'TRU-001',
      event: 'register',
      rsu: { ip: '192.168.1.1', port: 8080 }
    });
  });

  await waitFor(() => expect(result.current.loading).toBe(false));
  await promise;
});

test("updateRSU should set loading state", async () => {
  const { result } = renderHook(() => useTRUConfig(), { wrapper });

  const promise = act(async () => {
    await result.current.updateRSU({
      unitId: 'TRU-001',
      event: 'update',
      rsu: { ip: '192.168.1.1', port: 8080 }
    });
  });

  await waitFor(() => expect(result.current.loading).toBe(false));
  await promise;
});

test("deleteRSU should set loading state", async () => {
  const { result } = renderHook(() => useTRUConfig(), { wrapper });

  const promise = act(async () => {
    await result.current.deleteRSU('192.168.1.1', 8080, 'TRU-001');
  });

  await waitFor(() => expect(result.current.loading).toBe(false));
  await promise;
});

test("registerRSU should return success response", async () => {
  const { result } = renderHook(() => useTRUConfig(), { wrapper });

  let response;
  await act(async () => {
    response = await result.current.registerRSU({
      unitId: 'TRU-001',
      event: 'register',
      rsu: { ip: '192.168.1.1', port: 8080 }
    });
  });

  expect(response.success).toBe(true);
  expect(response.message).toBe('RSU registered successfully');
});

test("updateRSU should return success response", async () => {
  const { result } = renderHook(() => useTRUConfig(), { wrapper });

  let response;
  await act(async () => {
    response = await result.current.updateRSU({
      unitId: 'TRU-001',
      event: 'update',
      rsu: { ip: '192.168.1.1', port: 8080 }
    });
  });

  expect(response.success).toBe(true);
  expect(response.message).toBe('RSU configuration updated successfully');
});

test("deleteRSU should return success response", async () => {
  const { result } = renderHook(() => useTRUConfig(), { wrapper });

  let response;
  await act(async () => {
    response = await result.current.deleteRSU('192.168.1.1', 8080, 'TRU-001');
  });

  expect(response.success).toBe(true);
  expect(response.message).toBe('RSU deleted successfully');
});
