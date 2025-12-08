package com.telematic.telematic_rsu_management_service.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.telematic.telematic_rsu_management_service.registration.dto.TruConfigMessage;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
@Entity
@Table(name = "rsu_config_status")
public class RSUConfigStatus {
    @Id
    @GeneratedValue
    @Column(name = "rsu_config_status_id")
    private int id;

    @JsonProperty("event")
    private String event;

    @JsonProperty("rsu")
    @OneToOne(cascade = jakarta.persistence.CascadeType.ALL)
    @JoinColumn(name = "rsu_endpoint_id")
    private RSUEndpoint rsuEndpoint;

    @JsonProperty("status")
    private String status;

    @JsonProperty("dataTypes")
    @OneToMany(mappedBy = "rsuConfigStatus", cascade = jakarta.persistence.CascadeType.ALL)
    private List<RSUDataType> dataTypes;

    @JsonProperty("timestamp")
    private Long timestamp;

    @ManyToOne
    @JoinColumn(name = "tru_config_status_id", referencedColumnName = "tru_config_status_id")
    @JsonBackReference
    private TRUConfigStatus truConfigStatus;

}
