package com.telematic.telematic_rsu_management_service.health.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;


@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TRUHealthStatusMessage {
    @JsonProperty("AssignedRSUHealthStatus")
    public List<RSUHealthStatusMessage> rsuHealthStatus;

    @JsonProperty("Unit")
    public UnitHealthStatusMessage unitHealthStatus;
}
