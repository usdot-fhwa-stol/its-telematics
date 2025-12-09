package com.telematic.telematic_rsu_management_service.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Data;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
@Entity
@Table(name = "tru_config_status")
public class TRUConfigStatus {
     @Id
     @GeneratedValue
    @Column(name = "tru_config_status_id")
     private int id;
    
    @JsonProperty("Unit")
    @OneToOne(cascade = jakarta.persistence.CascadeType.ALL)
    @JoinColumn(name = "unit_config_id")
    private UnitConfig unitConfig;

    @JsonProperty("RSUConfigs")
    @OneToMany(mappedBy = "truConfigStatus", cascade = jakarta.persistence.CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<RSUConfigStatus> rsuConfigs;

    @JsonProperty("timestamp")
    private Long timestamp;

    @JsonProperty("PluginConfigStatus")
    @OneToOne(cascade = jakarta.persistence.CascadeType.ALL)
    @JoinColumn(name = "tru_plugin_config_status_id")
    private UnitPluginStatus pluginConfigStatus;   

}
