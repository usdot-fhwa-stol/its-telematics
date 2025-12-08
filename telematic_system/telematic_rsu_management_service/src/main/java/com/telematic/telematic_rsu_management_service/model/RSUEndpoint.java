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
@Table(name = "rsu_endpoint")
public class RSUEndpoint {
    @Id
    @Column(name = "rsu_endpoint_id")
    @GeneratedValue
    private int id;
    
    @JsonProperty("IP")
    private String ip;

    @JsonProperty("Port")
    private Integer port;

    @JsonProperty("timestamp")
    private Long timestamp;
}
