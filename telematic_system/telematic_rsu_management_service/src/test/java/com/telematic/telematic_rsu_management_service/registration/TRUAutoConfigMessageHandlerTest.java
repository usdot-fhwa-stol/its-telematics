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
package com.telematic.telematic_rsu_management_service.registration;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.context.ActiveProfiles;

import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.Serializer;
import com.telematic.telematic_rsu_management_service.registration.depositor.TRUAutoConfigMessageDepositor;
import com.telematic.telematic_rsu_management_service.registration.dto.TruConfigMessage;
import com.telematic.telematic_rsu_management_service.registration.handler.TRUAutoConfigMessageHandler;

@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
class TRUAutoConfigMessageHandlerTest {

    @Mock
    private TRUAutoConfigMessageDepositor depositor;

    @Mock
    private Serializer serializer;

    private TRUAutoConfigMessageHandler handler;

    @BeforeEach
    void setUp() {
        handler = new TRUAutoConfigMessageHandler(serializer, depositor);
    }

    @Test
    void testOnMessage_ShouldProcessMessage() {
        // Given
        String subject = "unit.TRU001.register.rsu.autoconfig";
        String payload = "{\"Unit\":{\"unitId\":\"TRU001\"}}";
        
        Message message = new Message(subject, payload.getBytes(), new java.util.HashMap<>());
        TruConfigMessage configMessage = new TruConfigMessage();
        
        when(serializer.decode(any(byte[].class), eq(TruConfigMessage.class))).thenReturn(configMessage);

        // When
        byte[] result = handler.onMessage(message);

        // Then
        assertNotNull(result);
        verify(serializer).decode(any(byte[].class), eq(TruConfigMessage.class));
        verify(depositor).processAutoTruConfigMessage(configMessage);
    }

    @Test
    void testOnMessage_WithDeserializationError_ShouldThrow() {
        // Given
        String subject = "unit.TRU001.register.rsu.autoconfig";
        String payload = "{invalid}";
        
        Message message = new Message(subject, payload.getBytes(), new java.util.HashMap<>());
        
        when(serializer.decode(any(byte[].class), eq(TruConfigMessage.class)))
            .thenThrow(new RuntimeException("Parse error"));

        // When/Then
        assertThrows(RuntimeException.class, () -> handler.onMessage(message));
    }
}
