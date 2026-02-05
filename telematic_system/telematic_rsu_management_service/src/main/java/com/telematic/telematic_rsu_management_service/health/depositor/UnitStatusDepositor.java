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
package com.telematic.telematic_rsu_management_service.health.depositor;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.telematic.telematic_rsu_management_service.health.dto.TRUHealthStatusMessage;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.UnitPluginStatus;
import com.telematic.telematic_rsu_management_service.repository.mysql.TRUConfigStatusRepository;

@Component
public class UnitStatusDepositor {
     private final TRUConfigStatusRepository truConfigStatusRepository;

    public UnitStatusDepositor(TRUConfigStatusRepository truConfigStatusRepository) {
        this.truConfigStatusRepository = truConfigStatusRepository;
    }

    @Transactional
    public void depositUnitStatus(TRUHealthStatusMessage truHealthStatusMessage) {
        if (truHealthStatusMessage.getUnitHealthStatus() == null
                || truHealthStatusMessage.getUnitHealthStatus().getUnitId() == null) {
            throw new IllegalArgumentException("depositUnitStatus: Unit ID is null");
        }
        
        TRUConfigStatus truConfigStatus = truConfigStatusRepository
                .findByUnitId(truHealthStatusMessage.getUnitHealthStatus().getUnitId());
        
        if (truConfigStatus != null) {
            // Initialize pluginConfigStatus if null
            if (truConfigStatus.getPluginConfigStatus() == null) {
                UnitPluginStatus pluginStatus = new UnitPluginStatus();
                pluginStatus.setTimestamp(System.currentTimeMillis());
                truConfigStatus.setPluginConfigStatus(pluginStatus);
            }
            
            // Update bridge plugin status and timestamps
            truConfigStatus.getPluginConfigStatus()
                    .setBridgePluginStatus(truHealthStatusMessage.getUnitHealthStatus().getBridgePluginStatus());
            truConfigStatus.getPluginConfigStatus()
                    .setLastCommunicationTimestamp(truHealthStatusMessage.getUnitHealthStatus().getLastCommunicationTimestamp());
            truConfigStatus.getPluginConfigStatus()
                    .setTimestamp(System.currentTimeMillis());
            
            truConfigStatusRepository.save(truConfigStatus);
        } else {
            throw new IllegalArgumentException("TRUConfigStatus not found for Unit ID: "
                    + truHealthStatusMessage.getUnitHealthStatus().getUnitId());
        }
    }
}
