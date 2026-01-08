<<<<<<< HEAD
export class UnitPluginStatus {
=======
// Unit Plugin Status definition
export class UnitPluginStatus {
    id?: number;
>>>>>>> 0cbe6a1 (registration api)
    bridgePluginStatus: string;
    lastCommunicationTimestamp: number;
    timestamp: number;

    constructor(
        bridgePluginStatus: string,
        lastCommunicationTimestamp: number,
<<<<<<< HEAD
        timestamp: number
    ) {
=======
        timestamp: number,
        id?: number
    ) {
        this.id = id;
>>>>>>> 0cbe6a1 (registration api)
        this.bridgePluginStatus = bridgePluginStatus;
        this.lastCommunicationTimestamp = lastCommunicationTimestamp;
        this.timestamp = timestamp;
    }
}
