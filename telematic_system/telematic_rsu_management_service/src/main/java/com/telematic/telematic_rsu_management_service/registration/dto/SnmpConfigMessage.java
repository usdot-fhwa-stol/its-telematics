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
