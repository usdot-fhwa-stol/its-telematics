package com.telematic.telematic_rsu_management_service.data_selection.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TopicMessage {    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("selected")
    private Boolean selected;
}
