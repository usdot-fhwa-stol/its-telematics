import { RSUEndpoint } from './rsu_endpoint.model';
import { SnmpConfigMessage } from './snmp_config_message.model';

// RsuConfigItemMessage definition
export class RsuConfigItemMessage {
    action: string;
    event: string;
    rsuEndpoint: RSUEndpoint;
    snmpConfig?: SnmpConfigMessage;

    constructor(
        action: string,
        event: string,
        rsuEndpoint: RSUEndpoint,
        snmpConfig?: SnmpConfigMessage
    ) {
        this.action = action;
        this.event = event;
        this.rsuEndpoint = rsuEndpoint;
        this.snmpConfig = snmpConfig;
    }
}
