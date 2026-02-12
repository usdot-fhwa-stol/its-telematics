/*
 * Copyright (C) 2025 LEIDOS.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
package com.telematic.telematic_rsu_management_service.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

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
    private RSUEndpoint rsu;

    @JsonProperty("status")
    private String status;

    @JsonProperty("timestamp")
    private Long timestamp;

    @ManyToOne
    @JoinColumn(name = "tru_config_status_id", referencedColumnName = "tru_config_status_id")
    @JsonBackReference
    private TRUConfigStatus truConfigStatus;

    @OneToMany(mappedBy = "rsuConfigStatus", cascade = jakarta.persistence.CascadeType.ALL, orphanRemoval = true)
    @JsonBackReference
    private List<DataSelectionRuleConfig> dataSelectionRuleConfigs;

}
