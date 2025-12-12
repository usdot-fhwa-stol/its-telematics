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
package com.telematic.telematic_rsu_management_service.data_ingestion.service;

import java.util.HashSet;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.data_ingestion.handler.DataIngestionHandler;
import com.telematic.telematic_rsu_management_service.messaging.nats.NatsMessagingClient;
import com.telematic.telematic_rsu_management_service.model.RSUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.repository.mysql.TRUConfigStatusRepository;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class DataIngestionService {
    private NatsMessagingClient natsMessagingClient;
    private DataIngestionHandler dataIngestionHandler;
    private final TRUConfigStatusRepository truConfigStatusRepository;
    
    @Value("${data.ingestion.workers-per-unit-rsu-pair:10}")
    private int workersPerUnitRsuPair;

    @Value("${data.ingestion.subject-prefix:unit.*.stream.rsu.*}")
    private String dataIngestionSubjectPrefix;

    private final Set<String> activePrefixes = new HashSet<>();

    public DataIngestionService(NatsMessagingClient natsMessagingClient, DataIngestionHandler dataIngestionHandler, TRUConfigStatusRepository truConfigStatusRepository) {
        this.natsMessagingClient = natsMessagingClient;
        this.dataIngestionHandler = dataIngestionHandler;
        this.truConfigStatusRepository = truConfigStatusRepository;
    }
    
     public void enableDataInjestionSubscriptions() {
        try {
            for (String newPrefixSubject : getLatestSubjectPrefixes().stream()
                    .filter(prefix -> !activePrefixes.contains(prefix)).toList()) {
                String queueGroup = newPrefixSubject.replace('.', '_').replace('>', 'g') + "_queue";
                log.info("Subscribing to ingestion prefix subject '{}' with queue '{}' ( workers={} )",
                        newPrefixSubject, queueGroup, workersPerUnitRsuPair);
                natsMessagingClient.subscribeQueue(newPrefixSubject, queueGroup, dataIngestionHandler,
                        workersPerUnitRsuPair);
                activePrefixes.add(newPrefixSubject);
            }
            
            for(String oldPrefix : activePrefixes.stream()
                    .filter(prefix -> !getLatestSubjectPrefixes().contains(prefix)).toList()) {
                    log.info("Unsubscribing data ingestion for prefix subject '{}'", oldPrefix);
                    natsMessagingClient.unsubscribeSubject(oldPrefix);
                    activePrefixes.remove(oldPrefix);
            }
        } catch (Exception e) {
            log.warn("Failed refreshing dynamic ingestion subscriptions: {}", e.getMessage());
        }
    }

    private Set<String> getLatestSubjectPrefixes() {
        Set<String> latestPrefixes = new HashSet<>();
        for (TRUConfigStatus tru : truConfigStatusRepository.findAllWithAssociations()) {
            String unitId = tru.getUnitConfig().getUnitId();
            if (unitId == null || unitId.isBlank()) {
                continue;
            }
            for (RSUConfigStatus rsu : tru.getRsuConfigs()) {
                String ip = rsu.getRsuEndpoint() != null ? rsu.getRsuEndpoint().getIp() : null;
                if (ip == null || ip.isBlank()) {
                    continue;
                }
                String ipNormalized = ip.replace('.', '_');
                String basePrefix = dataIngestionSubjectPrefix.replaceFirst("\\*", unitId).replaceFirst("\\*", ipNormalized);
                String prefixSubject = basePrefix + ".>";
                latestPrefixes.add(prefixSubject);
            }
        }
        return latestPrefixes;
    }

    @Scheduled(initialDelayString = "${data.ingestion.refresh.initial-delay-ms:10000}", fixedDelayString = "${data.ingestion.refresh.interval-ms:30000}")
    public void scheduledRefresh() {
        enableDataInjestionSubscriptions();
    }
}