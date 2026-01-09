const axios = require('axios');
jest.mock('axios');

const { DataSelectionApiRepository } = require('../../repository/rsu_management/data_selection.api.repository');
const { TRUTopicsMessage } = require('../../models/rsu_management/tru_topics_message.model');

describe('DataSelectionApiRepository', () => {
  const baseUrl = 'http://rsu-mgmt.test';
  let repo: any;

  beforeEach(() => {
    repo = new DataSelectionApiRepository(baseUrl);
    jest.clearAllMocks();
  });

  test('uses RSU_MANAGEMENT_SERVICE_URL env var as default baseUrl', async () => {
    const originalEnv = process.env.RSU_MANAGEMENT_SERVICE_URL;
    process.env.RSU_MANAGEMENT_SERVICE_URL = 'http://env-based-url';

    const envRepo: any = new DataSelectionApiRepository();
    const request = new TRUTopicsMessage('UnitEnv', [], Date.now());

    (axios.get as jest.Mock).mockResolvedValueOnce({ data: { unitId: 'UnitEnv', rsuTopics: [], timestamp: 1 } });

    await envRepo.getAvailableTopics(request);

    expect(axios.get).toHaveBeenCalledWith(
      'http://env-based-url/api/data-selection/available-topics',
      { data: request }
    );

    process.env.RSU_MANAGEMENT_SERVICE_URL = originalEnv;
  });

  test('falls back to localhost default when env var is not set', async () => {
    const originalEnv = process.env.RSU_MANAGEMENT_SERVICE_URL;
    delete process.env.RSU_MANAGEMENT_SERVICE_URL;

    const defaultRepo: any = new DataSelectionApiRepository();
    const request = new TRUTopicsMessage('UnitLocal', [], Date.now());

    (axios.get as jest.Mock).mockResolvedValueOnce({ data: { unitId: 'UnitLocal', rsuTopics: [], timestamp: 1 } });

    await defaultRepo.getAvailableTopics(request);

    expect(axios.get).toHaveBeenCalledWith(
      'http://localhost:8082/api/data-selection/available-topics',
      { data: request }
    );

    process.env.RSU_MANAGEMENT_SERVICE_URL = originalEnv;
  });

  test('getAvailableTopics sends request and maps response', async () => {
    const request = new TRUTopicsMessage('Unit001', [], Date.now());

    const responsePayload = {
      unitId: 'Unit001',
      rsuTopics: [
        {
          rsu: {
            ip: '192.168.0.10',
            port: 502,
            timestamp: 111
          },
          topics: [
            { name: 'bsm', selected: true },
            { name: 'spat', selected: false }
          ]
        }
      ],
      timestamp: 999
    };

    (axios.get as jest.Mock).mockResolvedValueOnce({ data: responsePayload });

    const result = await repo.getAvailableTopics(request);

    expect(axios.get).toHaveBeenCalledWith(
      `${baseUrl}/api/data-selection/available-topics`,
      { data: request }
    );

    expect(result).toBeInstanceOf(TRUTopicsMessage);
    expect(result.unitId).toBe('Unit001');
    expect(result.rsuTopics).toHaveLength(1);
    expect(result.rsuTopics[0].rsu.ip).toBe('192.168.0.10');
    expect(result.rsuTopics[0].topics[0].name).toBe('bsm');
    expect(result.rsuTopics[0].topics[0].selected).toBe(true);
  });

  test('confirmDataSelection sends POST and maps response', async () => {
    const request = new TRUTopicsMessage('Unit001', [], Date.now());

    const responsePayload = {
      unitId: 'Unit001',
      rsuTopics: [],
      timestamp: 999
    };

    (axios.post as jest.Mock).mockResolvedValueOnce({ data: responsePayload });

    const result = await repo.confirmDataSelection(request);

    expect(axios.post).toHaveBeenCalledWith(
      `${baseUrl}/api/data-selection/confirm-topics`,
      request
    );

    expect(result).toBeInstanceOf(TRUTopicsMessage);
    expect(result.unitId).toBe('Unit001');
  });

  test('getAvailableTopics throws with detailed backend error', async () => {
    const request = new TRUTopicsMessage('Unit001', [], Date.now());

    (axios.get as jest.Mock).mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          error: 'Backend error',
          details: 'Bad things',
        },
      },
    });

    await expect(repo.getAvailableTopics(request)).rejects.toThrow(
      'Failed to get available topics (500): Backend error - Bad things'
    );
  });

  test('confirmDataSelection throws with generic error message', async () => {
    const request = new TRUTopicsMessage('Unit001', [], Date.now());

    (axios.post as jest.Mock).mockRejectedValueOnce(new Error('Network down'));

    await expect(repo.confirmDataSelection(request)).rejects.toThrow(
      'Failed to confirm data selection: Network down'
    );
  });

  test('confirmDataSelection throws with backend error only', async () => {
    const request = new TRUTopicsMessage('Unit001', [], Date.now());

    (axios.post as jest.Mock).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error: 'Invalid selection',
        },
      },
    });

    await expect(repo.confirmDataSelection(request)).rejects.toThrow(
      'Failed to confirm data selection (400): Invalid selection'
    );
  });

  test('getAvailableTopics handles null response data by returning empty TRUTopicsMessage', async () => {
    const request = new TRUTopicsMessage('Unit001', [], Date.now());

    (axios.get as jest.Mock).mockResolvedValueOnce({ data: null });

    const result = await repo.getAvailableTopics(request);

    expect(result).toBeInstanceOf(TRUTopicsMessage);
    expect(result.unitId).toBe('');
    expect(result.rsuTopics).toEqual([]);
  });

  test('getAvailableTopics handles non-array rsuTopics by returning empty list', async () => {
    const request = new TRUTopicsMessage('Unit001', [], Date.now());

    const responsePayload = {
      unitId: 'UnitXYZ',
      rsuTopics: 'not-an-array',
      timestamp: 123,
    };

    (axios.get as jest.Mock).mockResolvedValueOnce({ data: responsePayload });

    const result = await repo.getAvailableTopics(request);

    expect(result).toBeInstanceOf(TRUTopicsMessage);
    expect(result.unitId).toBe('UnitXYZ');
    expect(result.rsuTopics).toEqual([]);
  });

  test('getAvailableTopics maps uppercase endpoint fields and default topic selection', async () => {
    const request = new TRUTopicsMessage('Unit001', [], Date.now());

    const responsePayload = {
      unitId: 'Unit001',
      rsuTopics: [
        {
          rsu: {
            IP: '192.168.0.20',
            Port: 601,
            timestamp: 222,
          },
          topics: [
            { name: 'mapme' }, // no selected field, should default to false
          ],
        },
      ],
      timestamp: 999,
    };

    (axios.get as jest.Mock).mockResolvedValueOnce({ data: responsePayload });

    const result = await repo.getAvailableTopics(request);

    expect(result.rsuTopics).toHaveLength(1);
    expect(result.rsuTopics[0].rsu.ip).toBe('192.168.0.20');
    expect(result.rsuTopics[0].rsu.port).toBe(601);
    expect(result.rsuTopics[0].topics[0].name).toBe('mapme');
    expect(result.rsuTopics[0].topics[0].selected).toBe(false);
  });

  test('getAvailableTopics creates empty topic list when topics is not an array', async () => {
    const request = new TRUTopicsMessage('Unit001', [], Date.now());

    const responsePayload = {
      unitId: 'Unit001',
      rsuTopics: [
        {
          rsu: {
            ip: '192.168.0.30',
            port: 700,
            timestamp: 333,
          },
          topics: null,
        },
      ],
      timestamp: 999,
    };

    (axios.get as jest.Mock).mockResolvedValueOnce({ data: responsePayload });

    const result = await repo.getAvailableTopics(request);

    expect(result.rsuTopics).toHaveLength(1);
    expect(result.rsuTopics[0].topics).toEqual([]);
    expect(result.rsuTopics[0].rsu.ip).toBe('192.168.0.30');
  });

  test('getAvailableTopics maps topic list when RSU endpoint is missing', async () => {
    const request = new TRUTopicsMessage('Unit001', [], Date.now());

    const responsePayload = {
      unitId: 'Unit001',
      rsuTopics: [
        {
          rsu: null,
          topics: [
            { name: 'bsm', selected: true },
          ],
        },
      ],
      timestamp: 999,
    };

    (axios.get as jest.Mock).mockResolvedValueOnce({ data: responsePayload });

    const result = await repo.getAvailableTopics(request);

    expect(result.rsuTopics).toHaveLength(1);
    expect(result.rsuTopics[0].topics).toHaveLength(1);
    // rsu is created as an empty RSUEndpoint object when endpoint is missing
    expect(result.rsuTopics[0].rsu).toBeDefined();
  });

  test('getAvailableTopics throws generic prefix-only error when no response or message', async () => {
    const request = new TRUTopicsMessage('Unit001', [], Date.now());

    // No response and no message property
    (axios.get as jest.Mock).mockRejectedValueOnce({});

    await expect(repo.getAvailableTopics(request)).rejects.toThrow(
      'Failed to get available topics'
    );
  });

  test('getAvailableTopics throws with backend details only and no status', async () => {
    const request = new TRUTopicsMessage('Unit001', [], Date.now());

    (axios.get as jest.Mock).mockRejectedValueOnce({
      response: {
        data: {
          details: 'Only details provided',
        },
      },
    });

    await expect(repo.getAvailableTopics(request)).rejects.toThrow(
      'Failed to get available topics: Only details provided'
    );
  });

  test('confirmDataSelection error message includes HTTP status when no backend fields', async () => {
    const request = new TRUTopicsMessage('Unit001', [], Date.now());

    (axios.post as jest.Mock).mockRejectedValueOnce({
      response: {
        status: 503,
        data: {},
      },
      message: 'Service unavailable',
    });

    await expect(repo.confirmDataSelection(request)).rejects.toThrow(
      'Failed to confirm data selection (503): Service unavailable'
    );
  });

  test('handleAxiosError logs constructed message via console.error', async () => {
    const request = new TRUTopicsMessage('Unit001', [], Date.now());
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    (axios.post as jest.Mock).mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          error: 'Backend failure',
        },
      },
    });

    await expect(repo.confirmDataSelection(request)).rejects.toThrow(
      'Failed to confirm data selection (500): Backend failure'
    );

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
