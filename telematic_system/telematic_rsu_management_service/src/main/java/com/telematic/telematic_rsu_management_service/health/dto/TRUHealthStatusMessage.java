package com.telematic.telematic_rsu_management_service.health.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;


@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TRUHealthStatusMessage {
    @JsonProperty("AssignedRSUs")
    public RSUHealthStatusMessage assignedRSUs;

    @JsonProperty("Unit")
    public UnitHealthStatusMessage unit;
}
