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

  test('getAvailableTopics handles null response data by returning empty TRUTopicsMessage', async () => {
    const request = new TRUTopicsMessage('Unit001', [], Date.now());

    (axios.get as jest.Mock).mockResolvedValueOnce({ data: null });

    const result = await repo.getAvailableTopics(request);

    expect(result).toBeInstanceOf(TRUTopicsMessage);
    expect(result.unitId).toBe('');
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
});
