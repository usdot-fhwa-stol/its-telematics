export class UnitPluginStatus {
    bridgePluginStatus: string;
    lastCommunicationTimestamp: number;
    timestamp: number;

    constructor(
        bridgePluginStatus: string,
        lastCommunicationTimestamp: number,
        timestamp: number
    ) {
        this.bridgePluginStatus = bridgePluginStatus;
        this.lastCommunicationTimestamp = lastCommunicationTimestamp;
        this.timestamp = timestamp;
    }
}
