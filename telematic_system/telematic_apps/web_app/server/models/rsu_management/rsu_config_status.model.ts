import { RSUEndpoint } from './rsu_endpoint.model';

// RSU Config Status definition
export class RSUConfigStatus {
    id?: number;
    event: string;
    rsuEndpoint: RSUEndpoint;
    status: string;
    timestamp: number;

    constructor(
        event: string,
        rsu: RSUEndpoint,
        status: string,
        timestamp: number,
        id?: number
    ) {
        this.id = id;
        this.event = event;
        this.rsuEndpoint = rsu;
        this.status = status;
        this.timestamp = timestamp;
    }
}
