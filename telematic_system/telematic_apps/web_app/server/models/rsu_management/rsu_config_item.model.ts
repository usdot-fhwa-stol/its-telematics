import { RSUEndpoint } from './rsu_endpoint.model';
import { SnmpConfigMessage } from './snmp_config_message.model';

// RsuConfigItemMessage definition
export class RsuConfigItemMessage {
    action: string;
    event: string;
<<<<<<< HEAD
    rsu: RSUEndpoint;
    snmp?: SnmpConfigMessage;
=======
    rsuEndpoint: RSUEndpoint;
    snmpConfig?: SnmpConfigMessage;
>>>>>>> 0cbe6a1 (registration api)

    constructor(
        action: string,
        event: string,
<<<<<<< HEAD
        rsu: RSUEndpoint,
        snmp?: SnmpConfigMessage
    ) {
        this.action = action;
        this.event = event;
        this.rsu = rsu;
        this.snmp = snmp;
=======
        rsuEndpoint: RSUEndpoint,
        snmpConfig?: SnmpConfigMessage
    ) {
        this.action = action;
        this.event = event;
        this.rsuEndpoint = rsuEndpoint;
        this.snmpConfig = snmpConfig;
>>>>>>> 0cbe6a1 (registration api)
    }
}
