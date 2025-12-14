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
package com.telematic.model;

import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.ActiveProfiles;

import com.telematic.telematic_rsu_management_service.model.RSUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.UnitConfig;

@ActiveProfiles("test")
class TRUConfigStatusTest {

    private TRUConfigStatus status;

    @BeforeEach
    void setUp() {
        status = new TRUConfigStatus();
    }

    @Test
    void testSetAndGetTimestamp() {
        // Given
        Long timestamp = 1234567890L;

        // When
        status.setTimestamp(timestamp);

        // Then
        assertEquals(timestamp, status.getTimestamp());
    }

    @Test
    void testSetAndGetUnitConfig() {
        // Given
        UnitConfig unitConfig = new UnitConfig();

        // When
        status.setUnitConfig(unitConfig);

        // Then
        assertEquals(unitConfig, status.getUnitConfig());
    }

    @Test
    void testSetAndGetRSUConfigs() {
        // Given
        RSUConfigStatus rsuConfig1 = new RSUConfigStatus();
        RSUConfigStatus rsuConfig2 = new RSUConfigStatus();
        List<RSUConfigStatus> configs = new ArrayList<>();
        configs.add(rsuConfig1);
        configs.add(rsuConfig2);

        // When
        status.setRsuConfigs(configs);

        // Then
        assertEquals(2, status.getRsuConfigs().size());
        assertTrue(status.getRsuConfigs().contains(rsuConfig1));
        assertTrue(status.getRsuConfigs().contains(rsuConfig2));
    }

    @Test
    void testToString_ShouldNotBeNull() {
        // Given
        status.setTimestamp(1234567890L);

        // When
        String result = status.toString();

        // Then
        assertNotNull(result);
    }

    @Test
    void testDefaultConstructor() {
        // When
        TRUConfigStatus newStatus = new TRUConfigStatus();

        // Then
        assertNotNull(newStatus);
        assertNull(newStatus.getTimestamp());
        assertNull(newStatus.getUnitConfig());
        assertNull(newStatus.getRsuConfigs());
    }
}
