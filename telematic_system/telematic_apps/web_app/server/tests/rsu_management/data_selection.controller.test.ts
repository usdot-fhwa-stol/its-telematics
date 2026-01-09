const { DataSelectionController } = require('../../controllers/rsu_management/data_selection.controller');

function createMockResponse() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe('DataSelectionController', () => {
  test('getAvailableTopics returns 400 when body is missing', async () => {
    const getAvailableTopicsApp = { execute: jest.fn() };
    const confirmDataSelectionApp = { execute: jest.fn() };

    const controller = new DataSelectionController(
      getAvailableTopicsApp,
      confirmDataSelectionApp
    );

    const req = { body: null } as any;
    const res = createMockResponse();
    const next = jest.fn();

    await controller.getAvailableTopics(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Request body is required',
      })
    );
    expect(getAvailableTopicsApp.execute).not.toHaveBeenCalled();
  });

  test('getAvailableTopics calls app and returns 200 for valid payload', async () => {
    const getAvailableTopicsApp = { execute: jest.fn().mockResolvedValue({ ok: true }) };
    const confirmDataSelectionApp = { execute: jest.fn() };

    const controller = new DataSelectionController(
      getAvailableTopicsApp,
      confirmDataSelectionApp
    );

    const req = {
      body: {
        unitId: 'Unit001',
        rsuTopics: [
          {
            rsuEndpoint: {
              ip: '192.168.0.10',
              port: 502,
              timestamp: 111,
            },
            topics: [
              { name: 'bsm', selected: true },
              { name: 'spat', selected: false },
            ],
          },
        ],
        timestamp: 999,
      },
    } as any;

    const res = createMockResponse();
    const next = jest.fn();

    await controller.getAvailableTopics(req, res, next);

    expect(getAvailableTopicsApp.execute).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Available topics retrieved successfully',
      })
    );
  });

  test('confirmDataSelection calls app and returns 200 for valid payload', async () => {
    const getAvailableTopicsApp = { execute: jest.fn() };
    const confirmDataSelectionApp = { execute: jest.fn().mockResolvedValue({ ok: true }) };

    const controller = new DataSelectionController(
      getAvailableTopicsApp,
      confirmDataSelectionApp
    );

    const req = {
      body: {
        unitId: 'Unit001',
        rsuTopics: [
          {
            rsuEndpoint: {
              ip: '192.168.0.10',
              port: 502,
              timestamp: 111,
            },
            topics: [
              { name: 'bsm', selected: true },
            ],
          },
        ],
        timestamp: 999,
      },
    } as any;

    const res = createMockResponse();
    const next = jest.fn();

    await controller.confirmDataSelection(req, res, next);

    expect(confirmDataSelectionApp.execute).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Data selection confirmed successfully',
      })
    );
  });
});
