export class RSUEndpoint {
    ip: string;
    port: number;
    timestamp?: number;

    constructor(ip: string, port: number, timestamp?: number) {
        this.ip = ip;
        this.port = port;
        this.timestamp = timestamp;
    }
}
