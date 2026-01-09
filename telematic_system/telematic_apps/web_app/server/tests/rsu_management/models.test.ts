const { UnitConfig } = require("../../models/rsu_management/unit_config.model");
const { UnitPluginStatus } = require("../../models/rsu_management/unit_plugin_status.model");
const { RSUEndpoint } = require("../../models/rsu_management/rsu_endpoint.model");
const { RSUConfigStatus } = require("../../models/rsu_management/rsu_config_status.model");
const { TruConfigStatus } = require("../../models/rsu_management/tru_config_status.model");
const { SnmpConfigMessage } = require("../../models/rsu_management/snmp_config_message.model");
const { RsuConfigItemMessage } = require("../../models/rsu_management/rsu_config_item.model");
const { TruConfigMessage } = require("../../models/rsu_management/tru_config_message.model");
const { TopicMessage } = require("../../models/rsu_management/topic_message.model");
const { RSUTopicsMessage } = require("../../models/rsu_management/rsu_topics_message.model");

describe("RSU management models", () => {
  test("UnitConfig constructor assigns fields", () => {
    const unit = new UnitConfig(
      "Unit001",
      "Test Unit",
      10,
      30,
      60,
      120,
      1234567890
    );

    expect(unit.unitId).toBe("Unit001");
    expect(unit.name).toBe("Test Unit");
    expect(unit.maxConnections).toBe(10);
    expect(unit.pluginHeartbeatInterval).toBe(30);
    expect(unit.healthMonitorPluginHeartbeatInterval).toBe(60);
    expect(unit.rsuStatusMonitorInterval).toBe(120);
    expect(unit.timestamp).toBe(1234567890);
  });

  test("UnitPluginStatus constructor assigns fields", () => {
    const status = new UnitPluginStatus("OK", 111, 222, 1);

    expect(status.bridgePluginStatus).toBe("OK");
    expect(status.lastCommunicationTimestamp).toBe(111);
    expect(status.timestamp).toBe(222);
    expect(status.id).toBe(1);
  });

  test("RSUEndpoint constructor assigns fields", () => {
    const endpoint = new RSUEndpoint("192.168.0.10", 502, 111);

    expect(endpoint.ip).toBe("192.168.0.10");
    expect(endpoint.port).toBe(502);
    expect(endpoint.timestamp).toBe(111);
  });

  test("RSUConfigStatus constructor assigns fields", () => {
    const endpoint = new RSUEndpoint("192.168.0.10", 502, 111);
    const status = new RSUConfigStatus("event", endpoint, "ACTIVE", 222, 10);

    expect(status.event).toBe("event");
    expect(status.rsu).toBe(endpoint);
    expect(status.status).toBe("ACTIVE");
    expect(status.timestamp).toBe(222);
    expect(status.id).toBe(10);
  });

  test("SnmpConfigMessage constructor assigns fields", () => {
    const snmp = new SnmpConfigMessage(
      "AES128",
      "authPriv",
      "SHA",
      "authPass",
      "snmpUser",
      "privPass",
      "v3"
    );

    expect(snmp.privacyProtocol).toBe("AES128");
    expect(snmp.securityLevel).toBe("authPriv");
    expect(snmp.authProtocol).toBe("SHA");
    expect(snmp.authPassPhrase).toBe("authPass");
    expect(snmp.user).toBe("snmpUser");
    expect(snmp.privacyPassPhrase).toBe("privPass");
    expect(snmp.rsuMibVersion).toBe("v3");
  });

  test("RsuConfigItemMessage constructor assigns fields", () => {
    const endpoint = new RSUEndpoint("192.168.0.10", 502, 111);
    const snmp = new SnmpConfigMessage("AES128", "authPriv", "SHA", "authPass", "user", "privPass", "v3");

    const item = new RsuConfigItemMessage("add", "test event", endpoint, snmp);

    expect(item.action).toBe("add");
    expect(item.event).toBe("test event");
    expect(item.rsu).toBe(endpoint);
    expect(item.snmp).toBe(snmp);
  });

  test("TruConfigMessage constructor assigns fields", () => {
    const unit = new UnitConfig("Unit001", "Test Unit", 10, 30, 60, 120, 1234567890);
    const endpoint = new RSUEndpoint("192.168.0.10", 502, 111);
    const snmp = new SnmpConfigMessage("AES128", "authPriv", "SHA", "authPass", "user", "privPass", "v3");
    const rsuItem = new RsuConfigItemMessage("add", "event", endpoint, snmp);

    const msg = new TruConfigMessage(unit, [rsuItem], 999);

    expect(msg.unitConfig).toBe(unit);
    expect(msg.rsuConfigs).toHaveLength(1);
    expect(msg.rsuConfigs[0]).toBe(rsuItem);
    expect(msg.timestamp).toBe(999);
  });

  test("TruConfigStatus constructor assigns fields", () => {
    const unit = new UnitConfig("Unit001", "Test Unit", 10, 30, 60, 120, 1234567890);
    const endpoint = new RSUEndpoint("192.168.0.10", 502, 111);
    const rsuStatus = new RSUConfigStatus("event", endpoint, "ACTIVE", 222, 10);
    const pluginStatus = new UnitPluginStatus("OK", 333, 444, 2);

    const status = new TruConfigStatus(unit, [rsuStatus], 555, pluginStatus, 99);

    expect(status.unitConfig).toBe(unit);
    expect(status.rsuConfigs).toHaveLength(1);
    expect(status.rsuConfigs[0]).toBe(rsuStatus);
    expect(status.timestamp).toBe(555);
    expect(status.pluginConfigStatus).toBe(pluginStatus);
    expect(status.id).toBe(99);
  });

  test("TopicMessage constructor assigns fields", () => {
    const topic = new TopicMessage("bsm", true);

    expect(topic.name).toBe("bsm");
    expect(topic.selected).toBe(true);
  });

  test("TopicMessage defaults selected to false when not provided", () => {
    const topic = new TopicMessage("spat");

    expect(topic.name).toBe("spat");
    expect(topic.selected).toBe(false);
  });

  test("RSUTopicsMessage constructor assigns fields", () => {
    const endpoint = new RSUEndpoint("192.168.0.10", 502, 111);
    const topics = [new TopicMessage("bsm", true), new TopicMessage("spat", false)];

    const msg = new RSUTopicsMessage(topics, endpoint);

    expect(msg.topics).toBe(topics);
    expect(msg.rsu).toBe(endpoint);
  });
});
