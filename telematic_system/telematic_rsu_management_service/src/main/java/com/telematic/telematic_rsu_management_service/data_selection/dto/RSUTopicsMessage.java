package com.telematic.telematic_rsu_management_service.data_selection.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.telematic.telematic_rsu_management_service.model.RSUEndpoint;

import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class RSUTopicsMessage {    
    @JsonProperty("topics")
    private List<TopicMessage> topics;
    
    @JsonProperty("rsuEndpoint")
    public RSUEndpoint rsuEndpoint;
}
