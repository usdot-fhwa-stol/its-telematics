const { AssignRSU } = require('../../application/rsu_management/assign_rsu');
const { RemoveRSU } = require('../../application/rsu_management/remove_rsu');
const { UpdateRSUConfig } = require('../../application/rsu_management/update_rsu_config');
const { AllRsuRegistrationStatus } = require('../../application/rsu_management/all_rsu_registration_status');
const { TruConfigStatus } = require('../../models/rsu_management/tru_config_status.model');
const { UnitConfig } = require('../../models/rsu_management/unit_config.model');
const { RSUEndpoint } = require('../../models/rsu_management/rsu_endpoint.model');
const { RSUConfigStatus } = require('../../models/rsu_management/rsu_config_status.model');
const { UnitPluginStatus } = require('../../models/rsu_management/unit_plugin_status.model');


describe('RSU management application services', () => {
  const validMessage = {
    unitConfig: { unitId: 'Unit001' },
    rsuConfigs: [{ action: 'add', event: 'event' }]
  };

  test('AssignRSU calls repository.registerRsu with valid message', async () => {
    const repo = { registerRsu: jest.fn().mockResolvedValue({ ok: true }) };
    const app = new AssignRSU(repo);

    const result = await app.execute(validMessage);

    expect(repo.registerRsu).toHaveBeenCalledWith(validMessage);
    expect(result).toEqual({ ok: true });
  });

  test('AssignRSU throws when message is missing', async () => {
    const repo = { registerRsu: jest.fn() };
    const app = new AssignRSU(repo);

    await expect(app.execute(undefined as any)).rejects.toThrow('TruConfigMessage is required');
  });

  test('AssignRSU throws when unitConfig is missing', async () => {
    const repo = { registerRsu: jest.fn() };
    const app = new AssignRSU(repo);

    await expect(app.execute({ rsuConfigs: [] })).rejects.toThrow('Unit configuration is required');
  });

  test('AssignRSU throws when rsuConfigs is missing', async () => {
    const repo = { registerRsu: jest.fn() };
    const app = new AssignRSU(repo);

    await expect(app.execute({ unitConfig: { unitId: 'Unit001' } })).rejects.toThrow('At least one RSU configuration is required');
  });

  test('AssignRSU throws when rsuConfigs is empty', async () => {
    const repo = { registerRsu: jest.fn() };
    const app = new AssignRSU(repo);

    await expect(app.execute({ unitConfig: { unitId: 'Unit001' }, rsuConfigs: [] })).rejects.toThrow('At least one RSU configuration is required');
  });

  test('RemoveRSU calls repository.registerRsu with valid message', async () => {
    const repo = { registerRsu: jest.fn().mockResolvedValue({ ok: true }) };
    const app = new RemoveRSU(repo);

    const result = await app.execute(validMessage);

    expect(repo.registerRsu).toHaveBeenCalledWith(validMessage);
    expect(result).toEqual({ ok: true });
  });

  test('RemoveRSU throws when message is missing', async () => {
    const repo = { registerRsu: jest.fn() };
    const app = new RemoveRSU(repo);

    await expect(app.execute(undefined as any)).rejects.toThrow('TruConfigMessage is required');
  });

  test('RemoveRSU throws when unitConfig is missing', async () => {
    const repo = { registerRsu: jest.fn() };
    const app = new RemoveRSU(repo);

    await expect(app.execute({ rsuConfigs: [] })).rejects.toThrow('Unit configuration is required');
  });

  test('RemoveRSU throws when rsuConfigs is missing', async () => {
    const repo = { registerRsu: jest.fn() };
    const app = new RemoveRSU(repo);

    await expect(app.execute({ unitConfig: { unitId: 'Unit001' } })).rejects.toThrow('At least one RSU configuration is required for removal');
  });

  test('RemoveRSU throws when rsuConfigs is empty', async () => {
    const repo = { registerRsu: jest.fn() };
    const app = new RemoveRSU(repo);

    await expect(app.execute({ unitConfig: { unitId: 'Unit001' }, rsuConfigs: [] })).rejects.toThrow('At least one RSU configuration is required for removal');
  });

  test('UpdateRSUConfig calls repository.registerRsu with valid message', async () => {
    const repo = { registerRsu: jest.fn().mockResolvedValue({ ok: true }) };
    const app = new UpdateRSUConfig(repo);

    const result = await app.execute(validMessage);

    expect(repo.registerRsu).toHaveBeenCalledWith(validMessage);
    expect(result).toEqual({ ok: true });
  });

  test('UpdateRSUConfig throws when message is missing', async () => {
    const repo = { registerRsu: jest.fn() };
    const app = new UpdateRSUConfig(repo);

    await expect(app.execute(undefined as any)).rejects.toThrow('TruConfigMessage is required');
  });

  test('UpdateRSUConfig throws when unitConfig is missing', async () => {
    const repo = { registerRsu: jest.fn() };
    const app = new UpdateRSUConfig(repo);

    await expect(app.execute({ rsuConfigs: [] })).rejects.toThrow('Unit configuration is required');
  });

  test('UpdateRSUConfig throws when rsuConfigs is missing', async () => {
    const repo = { registerRsu: jest.fn() };
    const app = new UpdateRSUConfig(repo);

    await expect(app.execute({ unitConfig: { unitId: 'Unit001' } })).rejects.toThrow('At least one RSU configuration is required');
  });

  test('UpdateRSUConfig throws when rsuConfigs is empty', async () => {
    const repo = { registerRsu: jest.fn() };
    const app = new UpdateRSUConfig(repo);

    await expect(app.execute({ unitConfig: { unitId: 'Unit001' }, rsuConfigs: [] })).rejects.toThrow('At least one RSU configuration is required');
  });

  test('AllRsuRegistrationStatus delegates to repository.getAllTruConfig', async () => {
    const unit1 = new UnitConfig('Unit001', 'Test Unit 1', 10, 30, 60, 120, 111);
    const unit2 = new UnitConfig('Unit002', 'Test Unit 2', 20, 40, 70, 130, 222);

    const rsuEndpoint1 = new RSUEndpoint('192.168.0.10', 502, 333);
    const rsuEndpoint2 = new RSUEndpoint('192.168.0.11', 502, 444);

    const rsuStatus1 = new RSUConfigStatus('test event', rsuEndpoint1, 'operational', 1767908748103, 10);
    const rsuStatus2 = new RSUConfigStatus('test event', rsuEndpoint2, 'fault', 1767908748103, 11);

    const pluginStatus1 = new UnitPluginStatus('running', 777, 1767908748103, 1767908748103);
    const pluginStatus2 = new UnitPluginStatus('offline', 999, 1767908748103, 1767908748103);

    const expected = [
      new TruConfigStatus(unit1, [rsuStatus1], 1234, pluginStatus1, 1),
      new TruConfigStatus(unit2, [rsuStatus2], 2345, pluginStatus2, 2),
    ];
    const repo = { getAllTruConfig: jest.fn().mockResolvedValue(expected) };
    const app = new AllRsuRegistrationStatus(repo);

    const result = await app.execute();

    expect(repo.getAllTruConfig).toHaveBeenCalled();
    expect(result).toEqual(expected);
  });
});
