package com.telematic.telematic_rsu_management_service.data_selection.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TRUTopicsMessage {
    @JsonProperty("unitId")
    public String unitId;

    @JsonProperty("rsuTopics")
    public List<RSUTopicsMessage> rsuTopics;

    @JsonProperty("timestamp")
    public Long timestamp;
}
