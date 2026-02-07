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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.context.ActiveProfiles;

import com.telematic.telematic_rsu_management_service.health.config.UnitHealthSchedulerConfig;
import com.telematic.telematic_rsu_management_service.model.RSUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.UnitConfig;
import com.telematic.telematic_rsu_management_service.model.UnitPluginStatus;
import com.telematic.telematic_rsu_management_service.repository.mysql.TRUConfigStatusRepository;

@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
class UnitHealthCheckSchedulerTest {

    @Mock
    private TRUConfigStatusRepository truConfigStatusRepository;

    @Mock
    private UnitHealthSchedulerConfig config;

    private UnitHealthCheckScheduler scheduler;

    @BeforeEach
    void setUp() {
        scheduler = new UnitHealthCheckScheduler(truConfigStatusRepository, config);
    }

    @Test
    void testCheckUnitHealth_ShouldRemoveInactiveUnit() {
        // Given
        long currentTime = System.currentTimeMillis();
        int heartbeatInterval = 10; // 10 seconds
        int maxMissedHeartbeats = 5;
        
        // Last communication was more than 5 * 10 seconds = 50 seconds ago
        long lastCommunicationTimestamp = currentTime - 60000; // 60 seconds ago
        
        TRUConfigStatus inactiveUnit = createUnit("UNIT001", lastCommunicationTimestamp, heartbeatInterval);
        
        when(truConfigStatusRepository.findAllWithAssociations()).thenReturn(Collections.singletonList(inactiveUnit));
        when(config.getMaxMissedHeartbeats()).thenReturn(maxMissedHeartbeats);

        // When
        scheduler.checkUnitHealth();

        // Then
        verify(truConfigStatusRepository).delete(inactiveUnit);
    }

    @Test
    void testCheckUnitHealth_ShouldNotRemoveActiveUnit() {
        // Given
        long currentTime = System.currentTimeMillis();
        int heartbeatInterval = 10; // 10 seconds
        int maxMissedHeartbeats = 5;
        
        // Last communication was within the threshold (40 seconds ago < 50 seconds threshold)
        long lastCommunicationTimestamp = currentTime - 40000; // 40 seconds ago
        
        TRUConfigStatus activeUnit = createUnit("UNIT002", lastCommunicationTimestamp, heartbeatInterval);
        
        when(truConfigStatusRepository.findAllWithAssociations()).thenReturn(Collections.singletonList(activeUnit));
        when(config.getMaxMissedHeartbeats()).thenReturn(maxMissedHeartbeats);

        // When
        scheduler.checkUnitHealth();

        // Then
        verify(truConfigStatusRepository, never()).delete(any(TRUConfigStatus.class));
    }

    @Test
    void testCheckUnitHealth_ShouldHandleMultipleUnits() {
        // Given
        long currentTime = System.currentTimeMillis();
        int heartbeatInterval = 10; // 10 seconds
        int maxMissedHeartbeats = 5;
        
        TRUConfigStatus activeUnit = createUnit("UNIT_ACTIVE", currentTime - 30000, heartbeatInterval);
        TRUConfigStatus inactiveUnit1 = createUnit("UNIT_INACTIVE_1", currentTime - 60000, heartbeatInterval);
        TRUConfigStatus inactiveUnit2 = createUnit("UNIT_INACTIVE_2", currentTime - 120000, heartbeatInterval);
        
        List<TRUConfigStatus> units = Arrays.asList(activeUnit, inactiveUnit1, inactiveUnit2);
        
        when(truConfigStatusRepository.findAllWithAssociations()).thenReturn(units);
        when(config.getMaxMissedHeartbeats()).thenReturn(maxMissedHeartbeats);

        // When
        scheduler.checkUnitHealth();

        // Then
        verify(truConfigStatusRepository, never()).delete(activeUnit);
        verify(truConfigStatusRepository).delete(inactiveUnit1);
        verify(truConfigStatusRepository).delete(inactiveUnit2);
    }

    @Test
    void testCheckUnitHealth_ShouldSkipUnitWithNullPluginStatus() {
        // Given
        TRUConfigStatus unitWithoutPluginStatus = new TRUConfigStatus();
        UnitConfig unitConfig = new UnitConfig();
        unitConfig.setUnitId("UNIT003");
        unitConfig.setPluginHeartbeatInterval(10);
        unitWithoutPluginStatus.setUnitConfig(unitConfig);
        unitWithoutPluginStatus.setPluginConfigStatus(null);
        
        when(truConfigStatusRepository.findAllWithAssociations())
            .thenReturn(Collections.singletonList(unitWithoutPluginStatus));

        // When
        scheduler.checkUnitHealth();

        // Then
        verify(truConfigStatusRepository, never()).delete(any(TRUConfigStatus.class));
    }

    @Test
    void testCheckUnitHealth_ShouldSkipUnitWithNullUnitConfig() {
        // Given
        TRUConfigStatus unitWithoutConfig = new TRUConfigStatus();
        UnitPluginStatus pluginStatus = new UnitPluginStatus();
        pluginStatus.setLastCommunicationTimestamp(System.currentTimeMillis() - 60000);
        unitWithoutConfig.setPluginConfigStatus(pluginStatus);
        unitWithoutConfig.setUnitConfig(null);
        
        when(truConfigStatusRepository.findAllWithAssociations())
            .thenReturn(Collections.singletonList(unitWithoutConfig));

        // When
        scheduler.checkUnitHealth();

        // Then
        verify(truConfigStatusRepository, never()).delete(any(TRUConfigStatus.class));
    }

    @Test
    void testCheckUnitHealth_ShouldSkipUnitWithNullLastCommunicationTimestamp() {
        // Given
        TRUConfigStatus unit = new TRUConfigStatus();
        UnitConfig unitConfig = new UnitConfig();
        unitConfig.setUnitId("UNIT004");
        unitConfig.setPluginHeartbeatInterval(10);
        unit.setUnitConfig(unitConfig);
        
        UnitPluginStatus pluginStatus = new UnitPluginStatus();
        pluginStatus.setLastCommunicationTimestamp(null);
        unit.setPluginConfigStatus(pluginStatus);
        
        when(truConfigStatusRepository.findAllWithAssociations())
            .thenReturn(Collections.singletonList(unit));

        // When
        scheduler.checkUnitHealth();

        // Then
        verify(truConfigStatusRepository, never()).delete(any(TRUConfigStatus.class));
    }

    @Test
    void testCheckUnitHealth_ShouldSkipUnitWithNullHeartbeatInterval() {
        // Given
        TRUConfigStatus unit = new TRUConfigStatus();
        UnitConfig unitConfig = new UnitConfig();
        unitConfig.setUnitId("UNIT005");
        unitConfig.setPluginHeartbeatInterval(null);
        unit.setUnitConfig(unitConfig);
        
        UnitPluginStatus pluginStatus = new UnitPluginStatus();
        pluginStatus.setLastCommunicationTimestamp(System.currentTimeMillis() - 60000);
        unit.setPluginConfigStatus(pluginStatus);
        
        when(truConfigStatusRepository.findAllWithAssociations())
            .thenReturn(Collections.singletonList(unit));

        // When
        scheduler.checkUnitHealth();

        // Then
        verify(truConfigStatusRepository, never()).delete(any(TRUConfigStatus.class));
    }

    @Test
    void testCheckUnitHealth_ShouldHandleEmptyUnitList() {
        // Given
        when(truConfigStatusRepository.findAllWithAssociations())
            .thenReturn(Collections.emptyList());

        // When
        scheduler.checkUnitHealth();

        // Then
        verify(truConfigStatusRepository, never()).delete(any(TRUConfigStatus.class));
    }

    @Test
    void testCheckUnitHealth_ShouldHandleRepositoryException() {
        // Given
        when(truConfigStatusRepository.findAllWithAssociations())
            .thenThrow(new RuntimeException("Database error"));

        // When
        scheduler.checkUnitHealth();

        // Then - Should not throw exception, just log it
        verify(truConfigStatusRepository, never()).delete(any(TRUConfigStatus.class));
    }

    @Test
    void testCheckUnitHealth_ShouldRemoveUnitExactlyAtThreshold() {
        // Given
        long currentTime = System.currentTimeMillis();
        int heartbeatInterval = 10; // 10 seconds
        int maxMissedHeartbeats = 5;
        
        // Last communication was just over the threshold (50.1 seconds ago)
        // Using 51000 to ensure we're past the threshold even with small timing differences
        long lastCommunicationTimestamp = currentTime - 51000;
        
        TRUConfigStatus unit = createUnit("UNIT006", lastCommunicationTimestamp, heartbeatInterval);
        
        when(truConfigStatusRepository.findAllWithAssociations()).thenReturn(Collections.singletonList(unit));
        when(config.getMaxMissedHeartbeats()).thenReturn(maxMissedHeartbeats);

        // When
        scheduler.checkUnitHealth();

        // Then - Unit past the threshold should be removed
        verify(truConfigStatusRepository).delete(unit);
    }

    @Test
    void testCheckUnitHealth_ShouldRemoveUnitJustPastThreshold() {
        // Given
        long currentTime = System.currentTimeMillis();
        int heartbeatInterval = 10; // 10 seconds
        int maxMissedHeartbeats = 5;
        
        // Last communication was just past the threshold (50.001 seconds ago)
        long lastCommunicationTimestamp = currentTime - 50001;
        
        TRUConfigStatus unit = createUnit("UNIT007", lastCommunicationTimestamp, heartbeatInterval);
        
        when(truConfigStatusRepository.findAllWithAssociations()).thenReturn(Collections.singletonList(unit));
        when(config.getMaxMissedHeartbeats()).thenReturn(maxMissedHeartbeats);

        // When
        scheduler.checkUnitHealth();

        // Then
        verify(truConfigStatusRepository).delete(unit);
    }

    @Test
    void testCheckUnitHealth_ShouldRemoveUnitWithRSUConnections() {
        // Given
        long currentTime = System.currentTimeMillis();
        int heartbeatInterval = 10; // 10 seconds
        int maxMissedHeartbeats = 5;
        long lastCommunicationTimestamp = currentTime - 60000; // 60 seconds ago
        
        TRUConfigStatus inactiveUnit = createUnit("UNIT008", lastCommunicationTimestamp, heartbeatInterval);
        
        // Add RSU connections
        RSUConfigStatus rsu1 = new RSUConfigStatus();
        RSUConfigStatus rsu2 = new RSUConfigStatus();
        inactiveUnit.setRsuConfigs(Arrays.asList(rsu1, rsu2));
        
        when(truConfigStatusRepository.findAllWithAssociations()).thenReturn(Collections.singletonList(inactiveUnit));
        when(config.getMaxMissedHeartbeats()).thenReturn(maxMissedHeartbeats);

        // When
        scheduler.checkUnitHealth();

        // Then - Should delete the unit along with its RSU connections (cascade)
        verify(truConfigStatusRepository).delete(inactiveUnit);
    }

    /**
     * Helper method to create a unit with specified parameters
     */
    private TRUConfigStatus createUnit(String unitId, long lastCommunicationTimestamp, int heartbeatInterval) {
        TRUConfigStatus unit = new TRUConfigStatus();
        
        UnitConfig unitConfig = new UnitConfig();
        unitConfig.setUnitId(unitId);
        unitConfig.setPluginHeartbeatInterval(heartbeatInterval);
        unit.setUnitConfig(unitConfig);
        
        UnitPluginStatus pluginStatus = new UnitPluginStatus();
        pluginStatus.setLastCommunicationTimestamp(lastCommunicationTimestamp);
        unit.setPluginConfigStatus(pluginStatus);
        
        return unit;
    }
}
