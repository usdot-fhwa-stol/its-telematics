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
package com.telematic.telematic_rsu_management_service.data_selection.service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.data_selection.depositor.DataSelectionDepositor;
import com.telematic.telematic_rsu_management_service.data_selection.dto.RSUTopicsMessage;
import com.telematic.telematic_rsu_management_service.data_selection.dto.TRUTopicsMessage;
import com.telematic.telematic_rsu_management_service.data_selection.dto.TopicMessage;
import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.Serializer;
import com.telematic.telematic_rsu_management_service.messaging.nats.NatsMessagingClient;
import com.telematic.telematic_rsu_management_service.model.DataSelectionRuleConfig;
import com.telematic.telematic_rsu_management_service.model.RSUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.repository.mysql.TRUConfigStatusRepository;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class DataSelectionService {

    private NatsMessagingClient natsMessagingClient;
    private Serializer serializer;
    private DataSelectionDepositor dataSelectionDepositor;
    private TRUConfigStatusRepository truConfigStatusRepository;

    @Value("${data.selection.available.topics.subject:unit.*.topic.rsu.available_topics}")
    public String availableTopicSubject;

    @Value("${data.selection.available.topics.request.timeout.seconds:10}")
    public int requestTimeoutSeconds;
    
    @Value("${data.selection.confirm.topics.subject:unit.*.topic.rsu.selected_topics}")
    public String confirmTopicSubject;
    
    @Value("${data.selection.confirm.topics.request.timeout.seconds:10}")
    public int confirmTopicRequestTimeoutSeconds;

    public DataSelectionService(NatsMessagingClient natsMessagingClient, Serializer serializer, DataSelectionDepositor dataSelectionDepositor, TRUConfigStatusRepository truConfigStatusRepository) {
        this.natsMessagingClient = natsMessagingClient;
        this.serializer = serializer;
        this.dataSelectionDepositor = dataSelectionDepositor;
        this.truConfigStatusRepository = truConfigStatusRepository;
    }
    
    public TRUTopicsMessage requestAvailableTopics(TRUTopicsMessage truTopicsMessage) {
        String subject = availableTopicSubject.replace("*", truTopicsMessage.getUnitId());
        log.info("Requesting available topics for TRU ID '{}' by to subject '{}': {}", truTopicsMessage.getUnitId(), subject, truTopicsMessage);
        Message message = natsMessagingClient.request(subject, serializer.encode(truTopicsMessage),
                Duration.ofSeconds(requestTimeoutSeconds));
        TRUTopicsMessage responseTopicMessage = serializer.decode(message.payload(), TRUTopicsMessage.class);
        log.info("Received available topics response: {}", responseTopicMessage);
        TRUConfigStatus truConfigStatus = truConfigStatusRepository.findByUnitId(truTopicsMessage.getUnitId());
        if (truConfigStatus == null || truConfigStatus.getRsuConfigs() == null
                || truConfigStatus.getRsuConfigs().isEmpty()) {
            log.info("No existing data selection rules found for TRU ID '{}'", truTopicsMessage.getUnitId());
            return responseTopicMessage;
        }
        // Build a map by IP address for matching, since TRU may send port=0
        Map<String, List<String>> ipToRules = truConfigStatus.getRsuConfigs().stream()
            .collect(Collectors.toMap(
                (RSUConfigStatus rsu) -> rsu.getRsu().getIp(),
                (RSUConfigStatus rsu) -> {
                    if (rsu.getDataSelectionRuleConfigs() != null) {
                        return rsu.getDataSelectionRuleConfigs().stream()
                                .map(DataSelectionRuleConfig::getRule)
                                .collect(Collectors.toList());
                    } else {
                        return new ArrayList<String>();
                    }
                },
                (List<String> a, List<String> b) -> {
                    List<String> merged = new ArrayList<>(a);
                    merged.addAll(b);
                    return merged;
                }
                ));
        log.info("Mark available topics based on existing rules by IP: {} ", ipToRules);
        for(RSUTopicsMessage rsuTopicsMessage : responseTopicMessage.getRsuTopics()) {
            // Match by IP address only
            List<String> existingRules = ipToRules.get(rsuTopicsMessage.getRsu().getIp());
            for (TopicMessage topicMessage : rsuTopicsMessage.getTopics()) {
                if (existingRules != null && existingRules.contains(topicMessage.getName())) {
                    topicMessage.setSelected(true);
                } else {
                    topicMessage.setSelected(false);
                }
            }               
        }
        return responseTopicMessage;
    }

    public TRUTopicsMessage requestDataSelection(TRUTopicsMessage truTopicsMessage) {
        String subject = confirmTopicSubject.replace("*", truTopicsMessage.getUnitId());
        log.info("Requesting topic confirmation for TRU ID '{}' to subject '{}': {}", truTopicsMessage.getUnitId(),
                subject, truTopicsMessage);
        Message message = natsMessagingClient.request(subject, serializer.encode(truTopicsMessage),
                Duration.ofSeconds(confirmTopicRequestTimeoutSeconds));   
        TRUTopicsMessage truTopicsMessageRResponse = serializer.decode(message.payload(), TRUTopicsMessage.class);
        log.info("Received confirm topics response: {}", truTopicsMessageRResponse);
        boolean persisted = dataSelectionDepositor.processDataSelection(truTopicsMessageRResponse);
        if (!persisted) {
            log.warn("Data selection persistence skipped due to missing configuration for TRU ID '{}'.", truTopicsMessage.getUnitId());
            throw new IllegalArgumentException("No TRU/RSU configuration found for unitId=" + truTopicsMessage.getUnitId());
        }
        return truTopicsMessageRResponse;
    }
}
