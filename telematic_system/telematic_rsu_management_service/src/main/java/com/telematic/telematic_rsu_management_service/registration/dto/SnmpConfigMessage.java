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
package com.telematic.telematic_rsu_management_service.registration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
public class SnmpConfigMessage {
    @JsonProperty("privacyProtocol")
    private String privacyProtocol;

    @JsonProperty("securityLevel")
    private String securityLevel;

    @JsonProperty("authProtocol")
    private String authProtocol;

    @JsonProperty("authPassPhrase")
    private String authPassPhrase;

    @JsonProperty("user")
    private String user;

    @JsonProperty("privacyPassPhrase")
    private String privacyPassPhrase;

    @JsonProperty("rsuMibVersion")
    private String rsuMibVersion;

}
