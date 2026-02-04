const { RegistrationController } = require('../../controllers/rsu_management/registration.controller');

function createMockResponse() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe('RegistrationController', () => {
  test('assignRSU returns 400 when body is missing', async () => {
    const assignRSUApp = { execute: jest.fn() };
    const removeRSUApp = { execute: jest.fn() };
    const updateRSUConfigApp = { execute: jest.fn() };
    const allRsuRegistrationStatusApp = { execute: jest.fn() };

    const controller = new RegistrationController(
      assignRSUApp,
      removeRSUApp,
      updateRSUConfigApp,
      allRsuRegistrationStatusApp
    );

    const req = { body: null } as any;
    const res = createMockResponse();
    const next = jest.fn();

    await controller.assignRSU(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Request body is required',
      })
    );
    expect(assignRSUApp.execute).not.toHaveBeenCalled();
  });

  test('assignRSU calls application service when payload is valid', async () => {
    const assignRSUApp = { execute: jest.fn().mockResolvedValue({ ok: true }) };
    const removeRSUApp = { execute: jest.fn() };
    const updateRSUConfigApp = { execute: jest.fn() };
    const allRsuRegistrationStatusApp = { execute: jest.fn() };

    const controller = new RegistrationController(
      assignRSUApp,
      removeRSUApp,
      updateRSUConfigApp,
      allRsuRegistrationStatusApp
    );

    const req = {
      body: {
        unitConfig: {
          unitId: 'Unit001',
          name: 'Test Unit',
          maxConnections: 10,
          pluginHeartbeatInterval: 30,
          healthMonitorPluginHeartbeatInterval: 60,
          rsuStatusMonitorInterval: 120,
          timestamp: 123,
        },
        rsuConfigs: [
          {
            action: 'add',
            event: 'test event',
            rsu: {
              ip: '192.168.0.10',
              port: 502,
              timestamp: 111,
            },
          },
        ],
        timestamp: 999,
      },
    } as any;

    const res = createMockResponse();
    const next = jest.fn();

    await controller.assignRSU(req, res, next);

    expect(assignRSUApp.execute).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'RSU assigned successfully',
      })
    );
  });

  test('assignRSU returns 500 when application service throws', async () => {
    const assignRSUApp = { execute: jest.fn().mockRejectedValue(new Error('Service failed')) };
    const removeRSUApp = { execute: jest.fn() };
    const updateRSUConfigApp = { execute: jest.fn() };
    const allRsuRegistrationStatusApp = { execute: jest.fn() };

    const controller = new RegistrationController(
      assignRSUApp,
      removeRSUApp,
      updateRSUConfigApp,
      allRsuRegistrationStatusApp
    );

    const req = {
      body: {
        unitConfig: {
          unitId: 'Unit001',
          name: 'Test Unit',
          maxConnections: 10,
          pluginHeartbeatInterval: 30,
          healthMonitorPluginHeartbeatInterval: 60,
          rsuStatusMonitorInterval: 120,
          timestamp: 123,
        },
        rsuConfigs: [
          {
            action: 'add',
            event: 'test event',
            rsu: {
              ip: '192.168.0.10',
              port: 502,
              timestamp: 111,
            },
          },
        ],
        timestamp: 999,
      },
    } as any;

    const res = createMockResponse();
    const next = jest.fn();

    await controller.assignRSU(req, res, next);

    expect(assignRSUApp.execute).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to assign RSU',
        message: 'Service failed',
      })
    );
  });

  test('assignRSU returns 500 when unitConfig is missing', async () => {
    const assignRSUApp = { execute: jest.fn() };
    const removeRSUApp = { execute: jest.fn() };
    const updateRSUConfigApp = { execute: jest.fn() };
    const allRsuRegistrationStatusApp = { execute: jest.fn() };

    const controller = new RegistrationController(
      assignRSUApp,
      removeRSUApp,
      updateRSUConfigApp,
      allRsuRegistrationStatusApp
    );

    const req = {
      body: {
        rsuConfigs: [],
        timestamp: 999,
      },
    } as any;

    const res = createMockResponse();
    const next = jest.fn();

    await controller.assignRSU(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to assign RSU',
        message: 'Unit configuration is required',
      })
    );
  });

  test('assignRSU returns 500 when RSU endpoint is missing', async () => {
    const assignRSUApp = { execute: jest.fn() };
    const removeRSUApp = { execute: jest.fn() };
    const updateRSUConfigApp = { execute: jest.fn() };
    const allRsuRegistrationStatusApp = { execute: jest.fn() };

    const controller = new RegistrationController(
      assignRSUApp,
      removeRSUApp,
      updateRSUConfigApp,
      allRsuRegistrationStatusApp
    );

    const req = {
      body: {
        unitConfig: {
          unitId: 'Unit001',
          name: 'Test Unit',
          maxConnections: 10,
          pluginHeartbeatInterval: 30,
          healthMonitorPluginHeartbeatInterval: 60,
          rsuStatusMonitorInterval: 120,
          timestamp: 123,
        },
        rsuConfigs: [
          {
            action: 'add',
            event: 'test event',
            // missing rsuEndpoint and rsu
          },
        ],
        timestamp: 999,
      },
    } as any;

    const res = createMockResponse();
    const next = jest.fn();

    await controller.assignRSU(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to assign RSU',
        message: 'RSU endpoint is required for each RSU config',
      })
    );
  });

  test('getAllTruConfig returns data from application service', async () => {
    const assignRSUApp = { execute: jest.fn() };
    const removeRSUApp = { execute: jest.fn() };
    const updateRSUConfigApp = { execute: jest.fn() };
    const expected = [{ id: 1 }, { id: 2 }];
    const allRsuRegistrationStatusApp = { execute: jest.fn().mockResolvedValue(expected) };

    const controller = new RegistrationController(
      assignRSUApp,
      removeRSUApp,
      updateRSUConfigApp,
      allRsuRegistrationStatusApp
    );

    const req = {} as any;
    const res = createMockResponse();
    const next = jest.fn();

    await controller.getAllTruConfig(req, res, next);

    expect(allRsuRegistrationStatusApp.execute).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expected,
        count: expected.length,
      })
    );
  });

  test('removeRSUAssignment returns 400 when body is missing', async () => {
    const assignRSUApp = { execute: jest.fn() };
    const removeRSUApp = { execute: jest.fn() };
    const updateRSUConfigApp = { execute: jest.fn() };
    const allRsuRegistrationStatusApp = { execute: jest.fn() };

    const controller = new RegistrationController(
      assignRSUApp,
      removeRSUApp,
      updateRSUConfigApp,
      allRsuRegistrationStatusApp
    );

    const req = { body: null } as any;
    const res = createMockResponse();
    const next = jest.fn();

    await controller.removeRSUAssignment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Request body is required',
      })
    );
    expect(removeRSUApp.execute).not.toHaveBeenCalled();
  });

  test('removeRSUAssignment calls application service when payload is valid', async () => {
    const assignRSUApp = { execute: jest.fn() };
    const removeRSUApp = { execute: jest.fn().mockResolvedValue({ ok: true }) };
    const updateRSUConfigApp = { execute: jest.fn() };
    const allRsuRegistrationStatusApp = { execute: jest.fn() };

    const controller = new RegistrationController(
      assignRSUApp,
      removeRSUApp,
      updateRSUConfigApp,
      allRsuRegistrationStatusApp
    );

    const req = {
      body: {
        unitConfig: {
          unitId: 'Unit001',
          name: 'Test Unit',
          maxConnections: 10,
          pluginHeartbeatInterval: 30,
          healthMonitorPluginHeartbeatInterval: 60,
          rsuStatusMonitorInterval: 120,
          timestamp: 123,
        },
        rsuConfigs: [
          {
            action: 'remove',
            event: 'test event',
            rsu: {
              ip: '192.168.0.10',
              port: 502,
              timestamp: 111,
            },
          },
        ],
        timestamp: 999,
      },
    } as any;

    const res = createMockResponse();
    const next = jest.fn();

    await controller.removeRSUAssignment(req, res, next);

    expect(removeRSUApp.execute).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'RSU removed successfully',
      })
    );
  });

  test('updateRSUConfig returns 400 when body is missing', async () => {
    const assignRSUApp = { execute: jest.fn() };
    const removeRSUApp = { execute: jest.fn() };
    const updateRSUConfigApp = { execute: jest.fn() };
    const allRsuRegistrationStatusApp = { execute: jest.fn() };

    const controller = new RegistrationController(
      assignRSUApp,
      removeRSUApp,
      updateRSUConfigApp,
      allRsuRegistrationStatusApp
    );

    const req = { body: null } as any;
    const res = createMockResponse();
    const next = jest.fn();

    await controller.updateRSUConfig(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Request body is required',
      })
    );
    expect(updateRSUConfigApp.execute).not.toHaveBeenCalled();
  });

  test('updateRSUConfig calls application service when payload is valid', async () => {
    const assignRSUApp = { execute: jest.fn() };
    const removeRSUApp = { execute: jest.fn() };
    const updateRSUConfigApp = { execute: jest.fn().mockResolvedValue({ ok: true }) };
    const allRsuRegistrationStatusApp = { execute: jest.fn() };

    const controller = new RegistrationController(
      assignRSUApp,
      removeRSUApp,
      updateRSUConfigApp,
      allRsuRegistrationStatusApp
    );

    const req = {
      body: {
        unitConfig: {
          unitId: 'Unit001',
          name: 'Test Unit',
          maxConnections: 10,
          pluginHeartbeatInterval: 30,
          healthMonitorPluginHeartbeatInterval: 60,
          rsuStatusMonitorInterval: 120,
          timestamp: 123,
        },
        rsuConfigs: [
          {
            action: 'update',
            event: 'test event',
            rsu: {
              ip: '192.168.0.10',
              port: 502,
              timestamp: 111,
            },
            snmp: {
              privacyProtocol: 'AES',
              securityLevel: 'authPriv',
              authProtocol: 'SHA',
              authPassPhrase: 'authPass',
              user: 'user1',
              privacyPassPhrase: 'privPass',
              rsuMibVersion: 'v3',
            },
          },
        ],
        timestamp: 999,
      },
    } as any;

    const res = createMockResponse();
    const next = jest.fn();

    await controller.updateRSUConfig(req, res, next);

    expect(updateRSUConfigApp.execute).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'RSU configuration updated successfully',
      })
    );
  });

  test('getAllTruConfig returns 500 when application service throws', async () => {
    const assignRSUApp = { execute: jest.fn() };
    const removeRSUApp = { execute: jest.fn() };
    const updateRSUConfigApp = { execute: jest.fn() };
    const allRsuRegistrationStatusApp = { execute: jest.fn().mockRejectedValue(new Error('Fetch failed')) };

    const controller = new RegistrationController(
      assignRSUApp,
      removeRSUApp,
      updateRSUConfigApp,
      allRsuRegistrationStatusApp
    );

    const req = {} as any;
    const res = createMockResponse();
    const next = jest.fn();

    await controller.getAllTruConfig(req, res, next);

    expect(allRsuRegistrationStatusApp.execute).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to retrieve TRU configurations',
        message: 'Fetch failed',
      })
    );
  });
});
