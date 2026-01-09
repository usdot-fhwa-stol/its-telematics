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
package com.telematic.telematic_rsu_management_service.registration.service;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.MessagingClient;
import com.telematic.telematic_rsu_management_service.messaging.Serializer;
import com.telematic.telematic_rsu_management_service.model.RSUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.RSUEndpoint;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.registration.depositor.TRUConfigMessageDepositor;
import com.telematic.telematic_rsu_management_service.registration.dto.TruConfigMessage;
import com.telematic.telematic_rsu_management_service.registration.handler.TRUAutoConfigMessageHandler;
import com.telematic.telematic_rsu_management_service.repository.mysql.TRUConfigStatusRepository;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class RegistrationService {

    private final MessagingClient messagingClient;
    private final TRUAutoConfigMessageHandler truAutoConfigMessageHandler;
    private final TRUConfigMessageDepositor truConfigMessageDepositor;
    private final TRUConfigStatusRepository truConfigStatusRepository;
    private final Serializer serializer;

    public RegistrationService(MessagingClient messagingClient, TRUAutoConfigMessageHandler truAutoConfigMessageHandler,
            Serializer serializer, TRUConfigMessageDepositor truConfigMessageDepositor,
            TRUConfigStatusRepository truConfigStatusRepository) {
        this.messagingClient = messagingClient;
        this.truAutoConfigMessageHandler = truAutoConfigMessageHandler;
        this.serializer = serializer;
        this.truConfigMessageDepositor = truConfigMessageDepositor;
        this.truConfigStatusRepository = truConfigStatusRepository;
    }

    public Message requestTruConfig(String truConfigSubject, TruConfigMessage truConfigMessage, long timeout) {
        byte[] payload = serializer.encode(truConfigMessage);
        log.info("Request for RSU configuration update on subject '{}': {}", truConfigSubject, truConfigMessage);
        if (isAddAction(truConfigMessage.getRsuConfigs().get(0).getAction()) && isRSUAssignedToTRU(truConfigMessage)) {
            log.info("RSU is already assigned to TRU Unit ID: {}, skipping request", truConfigMessage.getUnitConfig().getUnitId());
            throw new IllegalStateException("RSU is already assigned to TRU");
        }
        Message message = messagingClient.request(truConfigSubject, payload, Duration.ofSeconds(timeout));
        truConfigMessageDepositor.processTruConfigMessage(truConfigMessage);
        return message;
    }

    public void subscribeAutoTruConfig(String subject) {
        log.info("Subscribing to TRU auto configuration on subject: '{}'", subject);
        messagingClient.reply(subject, truAutoConfigMessageHandler);
    }

    public List<TRUConfigStatus> getAllTruConfigs() {
        return truConfigStatusRepository.findAll();
    }

    private boolean isAddAction(String action) {
        return action.equalsIgnoreCase("add") || action.equalsIgnoreCase("create");
    }

    private boolean isRSUAssignedToTRU(TruConfigMessage truConfigMessage) {
        TRUConfigStatus truConfigStatus = truConfigStatusRepository
                .findByUnitId(truConfigMessage.getUnitConfig().getUnitId());
        RSUEndpoint rsuEndpointToCheck = truConfigMessage.getRsuConfigs().get(0).getRsuEndpoint();
        if (truConfigStatus != null) {
            for (RSUEndpoint rsuEndpoint : truConfigStatus.getRsuConfigs().stream().map(RSUConfigStatus::getRsuEndpoint)
                    .toList()) {
                if (rsuEndpoint.getIp().equals(rsuEndpointToCheck.getIp())
                        && rsuEndpoint.getPort().equals(rsuEndpointToCheck.getPort())) {
                    return true;
                }
            }
        }
        return false;
    }
}