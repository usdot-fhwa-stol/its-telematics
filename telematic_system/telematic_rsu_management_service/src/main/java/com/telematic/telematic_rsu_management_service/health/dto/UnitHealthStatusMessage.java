package com.telematic.telematic_rsu_management_service.health.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UnitHealthStatusMessage {
    @JsonProperty("UnitId")
    private String unitId;
    
    @JsonProperty("BridgePluginStatus")
    private String bridgePluginStatus;
    
    @JsonProperty("HealthMonitorPluginStatus")
    private String healthMonitorPluginStatus;

    @JsonProperty("LastCommunicationTimestamp")
    private long lastCommunicationTimestamp;
}
