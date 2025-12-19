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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.data_ingestion.handler.DataIngestionHandler;
import com.telematic.telematic_rsu_management_service.messaging.nats.NatsMessagingClient;
import com.telematic.telematic_rsu_management_service.model.RSUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.repository.influx.InfluxDBRepository;
import com.telematic.telematic_rsu_management_service.repository.mysql.TRUConfigStatusRepository;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class DataIngestionService {
    private NatsMessagingClient natsMessagingClient;
    private final ApplicationContext applicationContext;
    private final TRUConfigStatusRepository truConfigStatusRepository;
    private final InfluxDBRepository influxDBRepository;
    
    @Value("${data.ingestion.workers-per-unit-rsu-pair:10}")
    private int workersPerUnitRsuPair;

    @Value("${data.ingestion.subject-prefix:unit.*.stream.rsu.*}")
    private String dataIngestionSubjectPrefix;

    @Value("${rsu_influx.token:}")
    private String adminToken;

    @Value("${rsu_influx.database:}")
    private String databaseName;

    private final Set<String> activePrefixes = new HashSet<>();
    private final Map<String, List<DataIngestionHandler>> prefixHandlers = new HashMap<>();

    public DataIngestionService(NatsMessagingClient natsMessagingClient, ApplicationContext applicationContext, TRUConfigStatusRepository truConfigStatusRepository, InfluxDBRepository influxDBRepository) {
        this.natsMessagingClient = natsMessagingClient;
        this.applicationContext = applicationContext;
        this.truConfigStatusRepository = truConfigStatusRepository;
        this.influxDBRepository = influxDBRepository;
    }

    public void initializeDataIngestionService() {
        try {
            if (adminToken != null && !adminToken.isBlank() && databaseName != null && !databaseName.isBlank()) {
                influxDBRepository.createDatabaseIfNotExists(databaseName, adminToken);
            } else {
                throw new RuntimeException(String.format(
                        "InfluxDB database creation failure: missing token or bucket name (token present? %b, bucket: '%s')",
                        adminToken != null && !adminToken.isBlank(), databaseName));
            }            
        } catch (RuntimeException e) {
            throw new RuntimeException(String.format("InfluxDB database creation failed: %s.", e.getMessage()), e);
        }
    }
    
     public void enableDataInjestionSubscriptions() {
        try {
            /* 
            ** Add unique instance ID to queue group to ensure multiple instances can run in parallel and each get a share of the messages. 
            ** The instance is identified by a random UUID.
             */
            String instanceId = java.util.UUID.randomUUID().toString().substring(0, 8);
            /**
             * Check the database for all TRU and RSU pairs and ensure subscriptions are active
             * for each. If new pairs are found, add subscriptions. If pairs are removed,
             * remove subscriptions.
             */
            for (String newPrefixSubject : getLatestSubjectPrefixes().stream()
                    .filter(prefix -> !activePrefixes.contains(prefix)).toList()) {
                String queueGroup = newPrefixSubject.replace('.', '_').replace('>', 'g') + "_queue_" + instanceId;
                log.info("Subscribing to ingestion prefix subject '{}' with queue '{}' ( workers={})",
                        newPrefixSubject, queueGroup, workersPerUnitRsuPair);
                
                List<DataIngestionHandler> handlers = new ArrayList<>();
                for (int i = 0; i < Math.max(1, workersPerUnitRsuPair); i++) {
                    log.info("Create worker #{} for subject '{}'", i, newPrefixSubject);
                    DataIngestionHandler handler = applicationContext.getBean(DataIngestionHandler.class);
                    natsMessagingClient.subscribeQueue(newPrefixSubject, queueGroup, handler, i);
                    handlers.add(handler);
                }                
                prefixHandlers.put(newPrefixSubject, handlers);
                activePrefixes.add(newPrefixSubject);
            }
            
            for(String oldPrefix : activePrefixes.stream()
                    .filter(prefix -> !getLatestSubjectPrefixes().contains(prefix)).toList()) {
                    log.info("Unsubscribing data ingestion for prefix subject '{}'", oldPrefix);
                    
                    // Clean up handlers before unsubscribing
                    List<DataIngestionHandler> handlers = prefixHandlers.remove(oldPrefix);
                    if (handlers != null) {
                        for (DataIngestionHandler handler : handlers) {
                            try {
                                handler.cleanup();
                            } catch (Exception e) {
                                log.warn("Error cleaning up handler for prefix '{}': {}", oldPrefix, e.getMessage());
                            }
                        }
                    }
                    
                    natsMessagingClient.unsubscribeSubject(oldPrefix);
                    activePrefixes.remove(oldPrefix);
            }
        } catch (Exception e) {
            log.error("Failed refreshing dynamic ingestion subscriptions: {}", e.getMessage(), e);
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
                String basePrefix = dataIngestionSubjectPrefix.replaceFirst("\\*", unitId).replaceFirst("\\*",
                        ipNormalized);
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