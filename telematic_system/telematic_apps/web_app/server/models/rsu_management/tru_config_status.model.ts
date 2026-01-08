import { UnitConfig } from './unit_config.model';
import { RSUConfigStatus } from './rsu_config_status.model';
import { UnitPluginStatus } from './unit_plugin_status.model';

// TRU Config Status definition
export class TruConfigStatus {
<<<<<<< HEAD
=======
    id?: number;
>>>>>>> 0cbe6a1 (registration api)
    unitConfig: UnitConfig;
    rsuConfigs: RSUConfigStatus[];
    timestamp: number;
    pluginConfigStatus: UnitPluginStatus;

    constructor(
        unitConfig: UnitConfig,
        rsuConfigs: RSUConfigStatus[],
        timestamp: number,
<<<<<<< HEAD
        pluginConfigStatus: UnitPluginStatus
    ) {
=======
        pluginConfigStatus: UnitPluginStatus,
        id?: number
    ) {
        this.id = id;
>>>>>>> 0cbe6a1 (registration api)
        this.unitConfig = unitConfig;
        this.rsuConfigs = rsuConfigs;
        this.timestamp = timestamp;
        this.pluginConfigStatus = pluginConfigStatus;
    }
}
