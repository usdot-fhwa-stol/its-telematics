package com.telematic.telematic_rsu_management_service.health.dto;


import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class RSUHealthStatusMessage {
    @JsonProperty("IP")
    public String ip;
    @JsonProperty("Port")
    public Integer port;
    @JsonProperty("Status")
    public String status;
    @JsonProperty("Event")
    public String event;
}
