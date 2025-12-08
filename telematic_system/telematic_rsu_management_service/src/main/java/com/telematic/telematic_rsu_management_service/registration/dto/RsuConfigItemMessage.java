package com.telematic.telematic_rsu_management_service.registration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.telematic.telematic_rsu_management_service.model.RSUEndpoint;

import lombok.Data;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
public class RsuConfigItemMessage {
    @JsonProperty("action")
    private String action;

    @JsonProperty("event")
    private String event;

    @JsonProperty("rsu")
    private RSUEndpoint rsuEndpoint;

    @JsonProperty("snmp")
    private SnmpConfigMessage snmpConfig;

}
