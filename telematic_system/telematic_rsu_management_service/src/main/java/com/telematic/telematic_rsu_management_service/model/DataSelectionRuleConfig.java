package com.telematic.telematic_rsu_management_service.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
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

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
@Entity
@Table(name = "data_selection_rule_configs")
public class DataSelectionRuleConfig {
    @Id
    @GeneratedValue
    @Column(name = "data_selection_rule_config_id")
    private Long id;

    @JsonProperty("Rule")
    private String rule;

    @ManyToOne
    @JoinColumn(name = "rsu_config_status_id", referencedColumnName = "rsu_config_status_id")
    @JsonBackReference
    private RSUConfigStatus rsuConfigStatus;

}
