// Unit Plugin Status definition
export class UnitPluginStatus {
    id?: number;
    bridgePluginStatus: string;
    lastCommunicationTimestamp: number;
    timestamp: number;

    constructor(
        bridgePluginStatus: string,
        lastCommunicationTimestamp: number,
        timestamp: number,
        id?: number
    ) {
        this.id = id;
        this.bridgePluginStatus = bridgePluginStatus;
        this.lastCommunicationTimestamp = lastCommunicationTimestamp;
        this.timestamp = timestamp;
    }
}
