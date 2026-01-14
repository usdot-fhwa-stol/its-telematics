import { RSUEndpoint } from './rsu_endpoint.model';

// RSU Config Status definition
export class RSUConfigStatus {
    event: string;
    rsu: RSUEndpoint;
    status: string;
    timestamp: number;

    constructor(
        event: string,
        rsu: RSUEndpoint,
        status: string,
        timestamp: number
    ) {
        this.event = event;
        this.rsu = rsu;
        this.status = status;
        this.timestamp = timestamp;
    }
}
