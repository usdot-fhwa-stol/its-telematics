package com.telematic.telematic_rsu_management_service.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
@Entity
@Table(name = "unit_config")
public class UnitConfig {
     @Id
     @GeneratedValue
    @Column(name = "unit_config_id")
     private int id;
    
    @JsonProperty("UnitID")
    private String unitId;

    @JsonProperty("Name")
    private String name;

    @JsonProperty("MaxConnections")
    private Integer maxConnections;

    @JsonProperty("BridgePluginHeartbeatInterval")
    private Integer bridgePluginHeartbeatInterval;

    @JsonProperty("HealthMonitorPluginHeartbeatInterval")
    private Integer healthMonitorPluginHeartbeatInterval;

    @JsonProperty("RSUStatusMonitorInterval")
    private Integer rsuStatusMonitorInterval;

    @JsonProperty("timestamp")
    private Long timestamp;

}
