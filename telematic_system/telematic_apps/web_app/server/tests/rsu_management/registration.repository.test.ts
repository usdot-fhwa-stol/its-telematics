const axios = require('axios');
jest.mock('axios');

const { RegistrationApiRepository } = require('../../repository/rsu_management/registration.api.repository');
const { TruConfigStatus } = require('../../models/rsu_management/tru_config_status.model');

describe('RegistrationApiRepository', () => {
  const baseUrl = 'http://rsu-mgmt.test';
  let repo: any;

  beforeEach(() => {
    repo = new RegistrationApiRepository(baseUrl);
    jest.clearAllMocks();
  });

  test('registerRsu forwards payload and returns response data', async () => {
    const payload = { unitConfig: { unitId: 'Unit001' }, rsuConfigs: [] };
    const responseData = { message: 'ok' };

    (axios.post as jest.Mock).mockResolvedValueOnce({ data: responseData });

    const result = await repo.registerRsu(payload);

    expect(axios.post).toHaveBeenCalledWith(
      `${baseUrl}/api/registration/update-tru-config`,
      payload
    );
    expect(result).toEqual(responseData);
  });

  test('registerRsu throws rich error when backend returns error details', async () => {
    const payload = { unitConfig: { unitId: 'Unit001' }, rsuConfigs: [] };

    (axios.post as jest.Mock).mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          error: 'Messaging backend unavailable',
          details: 'The RSU Management service could not get a response from the messaging broker (NATS).'
        }
      },
      message: 'Request failed with status code 500'
    });

    await expect(repo.registerRsu(payload)).rejects.toThrow(
      'Failed to register RSU (500): Messaging backend unavailable - The RSU Management service could not get a response from the messaging broker (NATS).'
    );
  });

  test('getAllTruConfig maps response into TruConfigStatus instances', async () => {
    const responsePayload = [
      {
        id: 1,
        unitConfig: {
          unitId: 'Unit002',
          name: null,
          maxConnections: 10,
          pluginHeartbeatInterval: 10,
          healthMonitorPluginHeartbeatInterval: 10,
          rsuStatusMonitorInterval: 10,
          timestamp: null
        },
        rsuConfigs: [
          {
            id: 2,
            event: 'test event',
            status: null,
            timestamp: 1767908748103,
            rsu: {
              ip: '192.168.1.11',
              port: 502,
              timestamp: null
            }
          },
          {
            id: 3,
            event: 'test event',
            status: null,
            timestamp: 1767908748103,
            rsu: {
              ip: '192.168.1.12',
              port: 502,
              timestamp: null
            }
          },
          {
            id: 304,
            event: 'test event updated',
            status: null,
            timestamp: 1767906986500,
            rsu: {
              ip: '192.168.1.10',
              port: 502,
              timestamp: null
            }
          }
        ],
        pluginConfigStatus: {},
        timestamp: 1767908748103
      }
    ];

    (axios.get as jest.Mock).mockResolvedValueOnce({ data: responsePayload });

    const result = await repo.getAllTruConfig();

    expect(axios.get).toHaveBeenCalledWith(
      `${baseUrl}/api/registration/all-tru-registration-status`
    );
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(TruConfigStatus);
    expect(result[0].unitConfig.unitId).toBe('Unit002');
    expect(result[0].rsuConfigs).toHaveLength(3);
    expect(result[0].rsuConfigs[0].rsu.ip).toBe('192.168.1.11');
    expect(result[0].rsuConfigs[1].rsu.ip).toBe('192.168.1.12');
    expect(result[0].rsuConfigs[2].rsu.ip).toBe('192.168.1.10');
  });

  test('getAllTruConfig returns empty array when response data is not an array', async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: null });

    const result = await repo.getAllTruConfig();

    expect(axios.get).toHaveBeenCalledWith(
      `${baseUrl}/api/registration/all-tru-registration-status`
    );
    expect(result).toEqual([]);
  });

  test('getAllTruConfig maps minimal item without optional sections', async () => {
    const responsePayload = [
      {
        id: 42,
        // no unitConfig, rsuConfigs, or pluginConfigStatus
        timestamp: 1234567890,
      },
    ];

    (axios.get as jest.Mock).mockResolvedValueOnce({ data: responsePayload });

    const result = await repo.getAllTruConfig();

    expect(result).toHaveLength(1);
    const status = result[0] as typeof TruConfigStatus.prototype;
    expect(status.unitConfig.unitId).toBeUndefined();
    expect(status.rsuConfigs).toHaveLength(0);
    expect(status.pluginConfigStatus.bridgePluginStatus).toBeUndefined();
    expect(status.timestamp).toBe(1234567890);
    expect(status.id).toBe(42);
  });

  test('getAllTruConfig throws generic error message when request fails without response', async () => {
    (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Network down'));

    await expect(repo.getAllTruConfig()).rejects.toThrow(
      'Failed to get all TRU configs: Network down'
    );
  });

  test('registerRsu throws generic error message when request fails without response', async () => {
    const payload = { unitConfig: { unitId: 'Unit001' }, rsuConfigs: [] };

    (axios.post as jest.Mock).mockRejectedValueOnce(new Error('Network down'));

    await expect(repo.registerRsu(payload)).rejects.toThrow(
      'Failed to register RSU: Network down'
    );
  });

  test('registerRsu throws with backend details only', async () => {
    const payload = { unitConfig: { unitId: 'Unit001' }, rsuConfigs: [] };

    (axios.post as jest.Mock).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          details: 'Invalid configuration',
        },
      },
    });

    await expect(repo.registerRsu(payload)).rejects.toThrow(
      'Failed to register RSU (400): Invalid configuration'
    );
  });

  test('getAllTruConfig handles non-array rsuConfigs by returning empty rsu list', async () => {
    const responsePayload = [
      {
        id: 99,
        unitConfig: {
          unitId: 'UnitNonArray',
          name: 'Test',
          maxConnections: 1,
          pluginHeartbeatInterval: 1,
          healthMonitorPluginHeartbeatInterval: 1,
          rsuStatusMonitorInterval: 1,
          timestamp: 1,
        },
        rsuConfigs: {}, // truthy but not an array
        pluginConfigStatus: {
          bridgePluginStatus: 'UP',
          lastCommunicationTimestamp: 123,
          timestamp: 123,
          id: 55,
        },
        timestamp: 123,
      },
    ];

    (axios.get as jest.Mock).mockResolvedValueOnce({ data: responsePayload });

    const result = await repo.getAllTruConfig();

    expect(result).toHaveLength(1);
    const status = result[0] as typeof TruConfigStatus.prototype;
    expect(status.unitConfig.unitId).toBe('UnitNonArray');
    expect(status.rsuConfigs).toHaveLength(0);
    expect(status.pluginConfigStatus.bridgePluginStatus).toBe('UP');
  });
});
