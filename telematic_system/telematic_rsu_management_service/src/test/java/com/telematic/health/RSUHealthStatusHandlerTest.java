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
package com.telematic.health;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.context.ActiveProfiles;

import com.telematic.telematic_rsu_management_service.health.depositor.RSUHealthStatusDepositor;
import com.telematic.telematic_rsu_management_service.health.dto.TRUHealthStatusMessage;
import com.telematic.telematic_rsu_management_service.health.handler.RSUHealthStatusHandler;
import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.Serializer;

@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
class RSUHealthStatusHandlerTest {

    @Mock
    private RSUHealthStatusDepositor depositor;

    @Mock
    private Serializer serializer;

    private RSUHealthStatusHandler handler;

    @BeforeEach
    void setUp() {
        handler = new RSUHealthStatusHandler(serializer, depositor);
    }

    @Test
    void testOnMessage_ShouldCallDepositor() {
        // Given
        String subject = "unit.TRU001.monitor.rsu.health_status";
        String payload = "{\"unitId\":\"TRU001\",\"status\":\"healthy\"}";
        
        Message message = new Message(subject, payload.getBytes(), new java.util.HashMap<>());
        TRUHealthStatusMessage healthStatusMessage = new TRUHealthStatusMessage();
        
        when(serializer.decode(any(byte[].class), eq(TRUHealthStatusMessage.class)))
            .thenReturn(healthStatusMessage);

        // When
        handler.onMessage(message);

        // Then
        verify(serializer).decode(any(byte[].class), eq(TRUHealthStatusMessage.class));
        verify(depositor).depositRSUHealthStatus(healthStatusMessage);
    }

    @Test
    void testOnMessage_WithEmptyPayload_ShouldDeserializeEmpty() {
        // Given
        String subject = "unit.TRU001.monitor.rsu.health_status";
        byte[] data = new byte[0];
        
        Message message = new Message(subject, data, new java.util.HashMap<>());
        TRUHealthStatusMessage healthStatusMessage = new TRUHealthStatusMessage();
        
        when(serializer.decode(any(byte[].class), eq(TRUHealthStatusMessage.class)))
            .thenReturn(healthStatusMessage);

        // When
        handler.onMessage(message);

        // Then
        verify(serializer).decode(any(byte[].class), eq(TRUHealthStatusMessage.class));
    }

    @Test
    void testOnMessage_MultipleMessages_ShouldProcessAll() {
        // Given
        String subject1 = "unit.TRU001.monitor.rsu.health_status";
        String subject2 = "unit.TRU002.monitor.rsu.health_status";
        String payload1 = "{\"unitId\":\"TRU001\",\"status\":\"healthy\"}";
        String payload2 = "{\"unitId\":\"TRU002\",\"status\":\"degraded\"}";
        
        Message msg1 = new Message(subject1, payload1.getBytes(), new java.util.HashMap<>());
        Message msg2 = new Message(subject2, payload2.getBytes(), new java.util.HashMap<>());
        
        TRUHealthStatusMessage healthStatus1 = new TRUHealthStatusMessage();
        TRUHealthStatusMessage healthStatus2 = new TRUHealthStatusMessage();
        
        when(serializer.decode(any(byte[].class), eq(TRUHealthStatusMessage.class)))
            .thenReturn(healthStatus1, healthStatus2);

        // When
        handler.onMessage(msg1);
        handler.onMessage(msg2);

        // Then
        verify(depositor, times(2)).depositRSUHealthStatus(any(TRUHealthStatusMessage.class));
    }
}
