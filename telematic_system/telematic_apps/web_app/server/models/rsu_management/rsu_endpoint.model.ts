<<<<<<< HEAD
export class RSUEndpoint {
    ip: string;
    port: number;

    constructor(ip: string, port: number) {
        this.ip = ip;
        this.port = port;
=======
// RSU Endpoint definition
export class RSUEndpoint {
    ip: string;
    port: number;
    timestamp?: number;

    constructor(ip: string, port: number, timestamp?: number) {
        this.ip = ip;
        this.port = port;
        this.timestamp = timestamp;
>>>>>>> 0cbe6a1 (registration api)
    }
}
