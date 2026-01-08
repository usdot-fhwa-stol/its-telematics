// Unit Config definition
export class UnitConfig {
    unitId: string;
    name: string;
    maxConnections: number;
    pluginHeartbeatInterval: number;
    healthMonitorPluginHeartbeatInterval: number;
    rsuStatusMonitorInterval: number;
    timestamp?: number;

    constructor(
        unitId: string,
        name: string,
        maxConnections: number,
        pluginHeartbeatInterval: number,
        healthMonitorPluginHeartbeatInterval: number,
        rsuStatusMonitorInterval: number,
        timestamp?: number
    ) {
        this.unitId = unitId;
        this.name = name;
        this.maxConnections = maxConnections;
        this.pluginHeartbeatInterval = pluginHeartbeatInterval;
        this.healthMonitorPluginHeartbeatInterval = healthMonitorPluginHeartbeatInterval;
        this.rsuStatusMonitorInterval = rsuStatusMonitorInterval;
        this.timestamp = timestamp;
    }
}
