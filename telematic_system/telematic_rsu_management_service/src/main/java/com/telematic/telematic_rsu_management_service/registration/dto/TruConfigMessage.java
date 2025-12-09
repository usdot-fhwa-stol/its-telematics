package com.telematic.telematic_rsu_management_service.registration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.telematic.telematic_rsu_management_service.model.UnitConfig;

import lombok.Data;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
public class TruConfigMessage {
    @JsonProperty("Unit")
    private UnitConfig unitConfig;

    @JsonProperty("RSUConfigs")
    private List<RsuConfigItemMessage> rsuConfigs;

    @JsonProperty("timestamp")
    private Long timestamp;

}
