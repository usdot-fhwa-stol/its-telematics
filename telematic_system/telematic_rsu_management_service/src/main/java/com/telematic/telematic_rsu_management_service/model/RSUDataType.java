package com.telematic.telematic_rsu_management_service.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
@Entity
@Table(name = "rsu_data_type")
public class RSUDataType {
     @Id
     @GeneratedValue
    @Column(name = "rsu_data_type_id")
     private int id;
    
    @JsonProperty("type")
    private String type;

    @JsonProperty("timestamp")
    private Long timestamp;

    @ManyToOne
    @JoinColumn(name = "rsu_config_status_id", referencedColumnName = "rsu_config_status_id")
    private RSUConfigStatus rsuConfigStatus;
}
