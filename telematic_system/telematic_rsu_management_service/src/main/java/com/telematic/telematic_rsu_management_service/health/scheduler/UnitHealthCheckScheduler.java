/*
 * Copyright (C) 2026 LEIDOS.
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
package com.telematic.telematic_rsu_management_service.health.scheduler;

import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.telematic.telematic_rsu_management_service.health.config.UnitHealthSchedulerConfig;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.UnitConfig;
import com.telematic.telematic_rsu_management_service.model.UnitPluginStatus;
import com.telematic.telematic_rsu_management_service.repository.mysql.TRUConfigStatusRepository;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
@ConditionalOnProperty(prefix = "monitor.unit.health.check", name = "enabled", havingValue = "true", matchIfMissing = true)
public class UnitHealthCheckScheduler {
    
    private final TRUConfigStatusRepository truConfigStatusRepository;
    private final UnitHealthSchedulerConfig config;
    
    public UnitHealthCheckScheduler(TRUConfigStatusRepository truConfigStatusRepository, 
                                    UnitHealthSchedulerConfig config) {
        this.truConfigStatusRepository = truConfigStatusRepository;
        this.config = config;
        log.info("Unit Health Check Scheduler initialized with maxMissedHeartbeats={}", 
                config.getMaxMissedHeartbeats());
    }
    
    @Scheduled(fixedDelayString = "${monitor.unit.health.check.interval-ms:60000}")
    @Transactional
    public void checkUnitHealth() {
        log.debug("Starting unit health check...");
        
        try {
            List<TRUConfigStatus> allUnits = truConfigStatusRepository.findAllWithAssociations();
            log.debug("Checking health for {} units", allUnits.size());
            
            long currentTime = System.currentTimeMillis();
            int removedCount = 0;
            
            for (TRUConfigStatus truConfigStatus : allUnits) {
                if (shouldRemoveUnit(truConfigStatus, currentTime)) {
                    String unitId = getUnitId(truConfigStatus);
                    log.warn("Unit {} failed health check - removing unit and all associated connections. " +
                            "Last communication: {}, Current time: {}, Max missed heartbeats: {}", 
                            unitId,
                            getLastPingTimestamp(truConfigStatus),
                            currentTime,
                            config.getMaxMissedHeartbeats());
                    
                    truConfigStatusRepository.delete(truConfigStatus);
                    removedCount++;
                }
            }
            
            if (removedCount > 0) {
                log.warn("Removed {} unhealthy unit(s) and their associated connections", removedCount);
            } else {
                log.debug("All units passed health check");
            }
            
        } catch (Exception e) {
            log.error("Error during unit health check", e.getMessage());
        }
    }
    
    /**
     * Determines if a unit should be removed based on its last communication timestamp
     * and the configured plugin heartbeat interval.
     * 
     * Logic: lastPingTimestamp + (maxMissedHeartbeats * pluginHeartbeatInterval) < currentTime
     * 
     * @param truConfigStatus the unit configuration status
     * @param currentTime the current timestamp in milliseconds
     * @return true if the unit should be removed, false otherwise
     */
    private boolean shouldRemoveUnit(TRUConfigStatus truConfigStatus, long currentTime) {
        UnitPluginStatus pluginStatus = truConfigStatus.getPluginConfigStatus();
        UnitConfig unitConfig = truConfigStatus.getUnitConfig();
        
        // Skip if essential data is missing
        if (pluginStatus == null || unitConfig == null) {
            log.info("Skipping unit check - missing plugin status or unit config");
            return false;
        }
        
        Long lastPingTimestamp = pluginStatus.getTimestamp();
        Integer pluginHeartbeatInterval = unitConfig.getPluginHeartbeatInterval();
        
        // Skip if last communication timestamp or heartbeat interval is not set
        if (lastPingTimestamp == null || pluginHeartbeatInterval == null) {
            log.info("Skipping unit {} - missing lastPingTimestamp or pluginHeartbeatInterval", 
                    getUnitId(truConfigStatus));
            return false;
        }
        
        // Calculate the threshold: lastPingTimestamp + (maxMissedHeartbeats * pluginHeartbeatInterval)
        long heartbeatIntervalMs = pluginHeartbeatInterval * 1000L; // Convert seconds to milliseconds
        long threshold = lastPingTimestamp + (config.getMaxMissedHeartbeats() * heartbeatIntervalMs);
        
        // Unit should be removed if current time exceeds the threshold
        boolean shouldRemove = currentTime > threshold;
        
        if (shouldRemove) {
            log.info("Unit {} exceeded threshold. LastComm: {}, Threshold: {}, Current: {}", 
                    getUnitId(truConfigStatus), lastPingTimestamp, threshold, currentTime);
        }
        
        return shouldRemove;
    }
    
    /**
     * Safely extracts the unit ID from TRUConfigStatus
     */
    private String getUnitId(TRUConfigStatus truConfigStatus) {
        if (truConfigStatus != null && truConfigStatus.getUnitConfig() != null) {
            return truConfigStatus.getUnitConfig().getUnitId();
        }
        return "unknown";
    }
    
    /**
     * Safely extracts the last ping timestamp from TRUConfigStatus
     */
    private Long getLastPingTimestamp(TRUConfigStatus truConfigStatus) {
        if (truConfigStatus != null && truConfigStatus.getPluginConfigStatus() != null) {
            return truConfigStatus.getPluginConfigStatus().getTimestamp();
        }
        return null;
    }
}
