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

import java.util.List;

import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.model.RSUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.registration.dto.TruConfigMessage;
import com.telematic.telematic_rsu_management_service.repository.mysql.TRUConfigStatusRepository;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class TRUAutoConfigMessageDepositor {
    
    private final TRUConfigStatusRepository truConfigStatusRepository;

    public TRUAutoConfigMessageDepositor(TRUConfigStatusRepository truConfigStatusRepository) {
        this.truConfigStatusRepository = truConfigStatusRepository;
    }

    public void processAutoTruConfigMessage(TruConfigMessage configMessage) {
        TRUConfigStatus truConfigStatus = new TRUConfigStatus();
        truConfigStatus.setUnitConfig(configMessage.getUnitConfig());
        truConfigStatus.setTimestamp(configMessage.getTimestamp());
        List<RSUConfigStatus> rsuConfigStatuses = configMessage.getRsuConfigs().stream().map(rsuConfigItem -> {
            RSUConfigStatus rsuConfigStatus = new RSUConfigStatus();
            rsuConfigStatus.setEvent(rsuConfigItem.getEvent());
            rsuConfigStatus.setRsuEndpoint(rsuConfigItem.getRsuEndpoint());
            rsuConfigStatus.setStatus(null);
            rsuConfigStatus.setTimestamp(configMessage.getTimestamp());
            rsuConfigStatus.setTruConfigStatus(truConfigStatus);
            return rsuConfigStatus;
        }).toList();
        truConfigStatus.setRsuConfigs(rsuConfigStatuses);
        truConfigStatusRepository.save(truConfigStatus);
        log.info("Saved TRU Config Status with ID: {}", truConfigStatus.getId());
    }
}
