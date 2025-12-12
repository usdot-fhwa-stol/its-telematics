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
package com.telematic.telematic_rsu_management_service.registration.depositor;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.model.RSUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.registration.dto.RsuConfigItemMessage;
import com.telematic.telematic_rsu_management_service.registration.dto.TruConfigMessage;
import com.telematic.telematic_rsu_management_service.repository.mysql.TRUConfigStatusRepository;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class TRUConfigMessageDepositor {
    
    private final TRUConfigStatusRepository truConfigStatusRepository;

    public TRUConfigMessageDepositor(TRUConfigStatusRepository truConfigStatusRepository) {
        this.truConfigStatusRepository = truConfigStatusRepository;
    }

    public void processTruConfigMessage(TruConfigMessage truConfigMessage) {
        TRUConfigStatus existingTruConfig = truConfigStatusRepository.findByUnitId(truConfigMessage.getUnitConfig().getUnitId());
        List<RSUConfigStatus> existingRsuConfigStatusList = existingTruConfig.getRsuConfigs();
        RsuConfigItemMessage rsuConfigItemMessage = truConfigMessage.getRsuConfigs().get(0);
        if(truConfigMessage.getRsuConfigs() != null && !truConfigMessage.getRsuConfigs().isEmpty() && truConfigMessage.getRsuConfigs().size() == 1) {
                log.info("Process TRU Config Message with Action: {}", rsuConfigItemMessage.getAction());
                if (rsuConfigItemMessage.getAction().equalsIgnoreCase("add") || rsuConfigItemMessage.getAction().equalsIgnoreCase("create")) {
                    if (existingRsuConfigStatusList.size() >= existingTruConfig.getUnitConfig().getMaxConnections()) {
                        throw new IllegalStateException("Cannot add more RSU configs than the maximum allowed connections");
                    }
                    RSUConfigStatus newRsuConfigStatus = new RSUConfigStatus();
                    newRsuConfigStatus.setEvent(rsuConfigItemMessage.getEvent());
                    newRsuConfigStatus.setRsuEndpoint(rsuConfigItemMessage.getRsuEndpoint());
                    newRsuConfigStatus.setStatus(null);
                    newRsuConfigStatus.setTimestamp(truConfigMessage.getTimestamp());
                    newRsuConfigStatus.setTruConfigStatus(existingTruConfig);
                    existingTruConfig.getRsuConfigs().add(newRsuConfigStatus);
                    truConfigStatusRepository.save(existingTruConfig);
                    log.info("Added RSU Config IP: {} port: {} for TRU Unit ID: {}, TRU ID: {}",
                                    newRsuConfigStatus.getRsuEndpoint().getIp(),
                                    newRsuConfigStatus.getRsuEndpoint().getPort(),
                                    existingTruConfig.getUnitConfig().getUnitId(),
                                                            existingTruConfig.getId());
                }else if (rsuConfigItemMessage.getAction().equalsIgnoreCase("update") || rsuConfigItemMessage.getAction().equalsIgnoreCase("modify")) {
                    for (RSUConfigStatus rsuConfigStatus : existingRsuConfigStatusList) {
                        if (rsuConfigStatus.getRsuEndpoint().getIp().equals(rsuConfigItemMessage.getRsuEndpoint().getIp())
                                && rsuConfigStatus.getRsuEndpoint().getPort().equals(rsuConfigItemMessage.getRsuEndpoint().getPort())) {
                            rsuConfigStatus.setEvent(rsuConfigItemMessage.getEvent());
                            rsuConfigStatus.setTimestamp(Instant.now().toEpochMilli());
                            truConfigStatusRepository.save(existingTruConfig);
                            log.info("Updated RSU Config IP: {} port: {} for TRU of Unit ID: {}, TRU ID: {}",
                                    rsuConfigStatus.getRsuEndpoint().getIp(),
                                    rsuConfigStatus.getRsuEndpoint().getPort(),
                                    existingTruConfig.getUnitConfig().getUnitId(),
                                                            existingTruConfig.getId());
                            break;
                        }
                    }
                }else if (rsuConfigItemMessage.getAction().equalsIgnoreCase("remove") || rsuConfigItemMessage.getAction().equalsIgnoreCase("delete")) {
                    existingRsuConfigStatusList.removeIf(rsuConfigStatus -> {
                        boolean match = rsuConfigStatus.getRsuEndpoint().getIp().equals(rsuConfigItemMessage.getRsuEndpoint().getIp())
                                && rsuConfigStatus.getRsuEndpoint().getPort().equals(rsuConfigItemMessage.getRsuEndpoint().getPort());
                        if (match) {
                            rsuConfigStatus.setTruConfigStatus(null);
                        }
                        return match;
                    });
                    truConfigStatusRepository.save(existingTruConfig);
                    log.info("Removed RSU Config IP: {} port: {} from TRU of Unit ID: {}, TRU ID: {}",
                            rsuConfigItemMessage.getRsuEndpoint().getIp(),
                            rsuConfigItemMessage.getRsuEndpoint().getPort(),
                            existingTruConfig.getUnitConfig().getUnitId(),
                            existingTruConfig.getId());
                }else {
                    throw new IllegalArgumentException("Unsupported action: " + rsuConfigItemMessage.getAction());
                }
        }else{
            throw new IllegalArgumentException("Only one RSU config item is supported per TRU config message");
        }
    }
}
