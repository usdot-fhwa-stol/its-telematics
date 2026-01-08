<<<<<<< HEAD
=======
// Unit Config definition
>>>>>>> 0cbe6a1 (registration api)
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
<<<<<<< HEAD
        resuStatusMonitorInterval: number,
=======
        rsuStatusMonitorInterval: number,
>>>>>>> 0cbe6a1 (registration api)
        timestamp?: number
    ) {
        this.unitId = unitId;
        this.name = name;
        this.maxConnections = maxConnections;
        this.pluginHeartbeatInterval = pluginHeartbeatInterval;
        this.healthMonitorPluginHeartbeatInterval = healthMonitorPluginHeartbeatInterval;
<<<<<<< HEAD
        this.rsuStatusMonitorInterval = resuStatusMonitorInterval;
=======
        this.rsuStatusMonitorInterval = rsuStatusMonitorInterval;
>>>>>>> 0cbe6a1 (registration api)
        this.timestamp = timestamp;
    }
}
