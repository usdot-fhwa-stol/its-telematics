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

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.ActiveProfiles;

import com.telematic.telematic_rsu_management_service.model.RSUEndpoint;

@ActiveProfiles("test")
class RSUEndpointTest {

    private RSUEndpoint rsu;

    @BeforeEach
    void setUp() {
        rsu = new RSUEndpoint();
    }

    @Test
    void testSetAndGetIp() {
        // Given
        String ip = "192.168.1.100";

        // When
        rsu.setIp(ip);

        // Then
        assertEquals(ip, rsu.getIp());
    }

    @Test
    void testSetAndGetPort() {
        // Given
        Integer port = 502;

        // When
        rsu.setPort(port);

        // Then
        assertEquals(port, rsu.getPort());
    }

    @Test
    void testSetAndGetTimestamp() {
        // Given
        Long timestamp = 1234567890L;

        // When
        rsu.setTimestamp(timestamp);

        // Then
        assertEquals(timestamp, rsu.getTimestamp());
    }

    @Test
    void testDefaultConstructor() {
        // When
        RSUEndpoint newRsu = new RSUEndpoint();

        // Then
        assertNotNull(newRsu);
        assertNull(newRsu.getIp());
        assertNull(newRsu.getPort());
        assertNull(newRsu.getTimestamp());
    }

    @Test
    void testToString_ShouldContainIp() {
        // Given
        rsu.setIp("192.168.1.100");
        rsu.setPort(502);

        // When
        String result = rsu.toString();

        // Then
        assertNotNull(result);
        assertTrue(result.contains("192.168.1.100") || result.contains("ip"));
    }

    @Test
    void testEquality_WithSameIpAndPort() {
        // Given
        RSUEndpoint rsu1 = new RSUEndpoint();
        rsu1.setIp("192.168.1.100");
        rsu1.setPort(502);
        
        RSUEndpoint rsu2 = new RSUEndpoint();
        rsu2.setIp("192.168.1.100");
        rsu2.setPort(502);

        // Then
        assertEquals(rsu1.getIp(), rsu2.getIp());
        assertEquals(rsu1.getPort(), rsu2.getPort());
    }

    @Test
    void testSetAllFields() {
        // Given
        String ip = "10.0.0.1";
        Integer port = 8080;
        Long timestamp = 1234567890L;

        // When
        rsu.setIp(ip);
        rsu.setPort(port);
        rsu.setTimestamp(timestamp);

        // Then
        assertEquals(ip, rsu.getIp());
        assertEquals(port, rsu.getPort());
        assertEquals(timestamp, rsu.getTimestamp());
    }
}
