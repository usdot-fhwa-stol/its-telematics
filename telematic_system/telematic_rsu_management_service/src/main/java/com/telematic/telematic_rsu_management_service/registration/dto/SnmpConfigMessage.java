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
    @JsonProperty("PrivacyProtocol")
    private String privacyProtocol;

    @JsonProperty("SecurityLevel")
    private String securityLevel;

    @JsonProperty("AuthProtocol")
    private String authProtocol;

    @JsonProperty("AuthPassPhrase")
    private String authPassPhrase;

    @JsonProperty("User")
    private String user;

    @JsonProperty("PrivacyPassPhrase")
    private String privacyPassPhrase;

    @JsonProperty("RSUMIBVersion")
    private String rsuMibVersion;

}
