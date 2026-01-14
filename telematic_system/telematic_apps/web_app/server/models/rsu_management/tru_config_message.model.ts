import { UnitConfig } from './unit_config.model';
import { RsuConfigItemMessage } from './rsu_config_item.model';

// TruConfigMessage definition
export class TruConfigMessage {
	unitConfig: UnitConfig;
	rsuConfigs: RsuConfigItemMessage[];
	timestamp?: number;

	constructor(
		unitConfig: UnitConfig,
		rsuConfigs: RsuConfigItemMessage[],
		timestamp?: number
	) {
		this.unitConfig = unitConfig;
		this.rsuConfigs = rsuConfigs;
		this.timestamp = timestamp;
	}
}
