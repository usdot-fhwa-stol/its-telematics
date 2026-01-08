import { RSUEndpoint } from './rsu_endpoint.model';

// RSU Config Status definition
export class RSUConfigStatus {
<<<<<<< HEAD
=======
    id?: number;
>>>>>>> 0cbe6a1 (registration api)
    event: string;
    rsu: RSUEndpoint;
    status: string;
    timestamp: number;

    constructor(
        event: string,
        rsu: RSUEndpoint,
        status: string,
<<<<<<< HEAD
        timestamp: number
    ) {
=======
        timestamp: number,
        id?: number
    ) {
        this.id = id;
>>>>>>> 0cbe6a1 (registration api)
        this.event = event;
        this.rsu = rsu;
        this.status = status;
        this.timestamp = timestamp;
    }
}
