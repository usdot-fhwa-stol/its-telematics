import { RSUEndpoint } from './rsu_endpoint.model';
import { SnmpConfigMessage } from './snmp_config_message.model';

// RsuConfigItemMessage definition
export class RsuConfigItemMessage {
    action: string;
    event: string;
    rsu: RSUEndpoint;
    snmp?: SnmpConfigMessage;

    constructor(
        action: string,
        event: string,
        rsu: RSUEndpoint,
        snmp?: SnmpConfigMessage
    ) {
        this.action = action;
        this.event = event;
        this.rsu = rsu;
        this.snmp = snmp;
    }
}
