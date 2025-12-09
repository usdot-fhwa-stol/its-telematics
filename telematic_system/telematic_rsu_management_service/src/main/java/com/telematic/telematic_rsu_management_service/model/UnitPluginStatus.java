package com.telematic.telematic_rsu_management_service.model;


import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
@Entity
@Table(name = "unit_plugin_status")
public class UnitPluginStatus {
    @Id
    @GeneratedValue
    @Column(name = "unit_plugin_status_id")
    private int id;
    
    @JsonProperty("BridgePluginStatus")
    private String bridgePluginStatus;
    
    @JsonProperty("HealthMonitorPluginStatus")
    private String healthMonitorPluginStatus;

    @JsonProperty("LastCommunicationTimestamp")
    private Long lastCommunicationTimestamp;
    
    @JsonProperty("timestamp")
    private Long timestamp;
}
