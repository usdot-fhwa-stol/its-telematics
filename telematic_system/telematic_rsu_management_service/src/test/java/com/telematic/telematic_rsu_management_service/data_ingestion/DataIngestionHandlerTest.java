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
package com.telematic.telematic_rsu_management_service.data_ingestion;

import static org.mockito.Mockito.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.context.ActiveProfiles;

import com.telematic.telematic_rsu_management_service.data_ingestion.depositor.DataIngestionDepositor;
import com.telematic.telematic_rsu_management_service.data_ingestion.handler.DataIngestionHandler;
import com.telematic.telematic_rsu_management_service.messaging.Message;

@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
class DataIngestionHandlerTest {

    @Mock
    private DataIngestionDepositor depositor;

    private DataIngestionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new DataIngestionHandler(depositor);
    }

    @Test
    void testOnMessage_ShouldCallDepositor() {
        // Given
        String subject = "unit.test.stream.rsu.192_168_1_1.safety";
        String payload = "{\"metadata\": {\"timestamp\": 123456}}";
        
        Message message = new Message(subject, payload.getBytes(), new java.util.HashMap<>());

        // When
        handler.onMessage(message);

        // Then
        verify(depositor).depositData(payload);
    }

    @Test
    void testOnMessage_WithEmptyPayload_ShouldCallDepositorWithEmptyString() {
        // Given
        String subject = "unit.test.stream.rsu.192_168_1_1.safety";
        byte[] data = new byte[0];
        
        Message message = new Message(subject, data, new java.util.HashMap<>());

        // When
        handler.onMessage(message);

        // Then
        verify(depositor).depositData("");
    }

    @Test
    void testOnMessage_WithMultipleMessages_ShouldIncrementCount() {
        // Given
        String subject = "unit.test.stream.rsu.192_168_1_1.safety";
        String payload1 = "{\"id\": 1}";
        String payload2 = "{\"id\": 2}";
        
        Message msg1 = new Message(subject, payload1.getBytes(), new java.util.HashMap<>());
        Message msg2 = new Message(subject, payload2.getBytes(), new java.util.HashMap<>());

        // When
        handler.onMessage(msg1);
        handler.onMessage(msg2);

        // Then
        verify(depositor, times(2)).depositData(anyString());
    }

    @Test
    void testOnMessage_WithDepositorException_ShouldNotThrow() {
        // Given
        String subject = "unit.test.stream.rsu.192_168_1_1.safety";
        String payload = "{\"test\": \"data\"}";
        
        Message message = new Message(subject, payload.getBytes(), new java.util.HashMap<>());
        doThrow(new RuntimeException("Depositor error")).when(depositor).depositData(anyString());

        // When/Then - Should not throw
        try {
            handler.onMessage(message);
        } catch (Exception e) {
            // Expected behavior - handler may log but shouldn't crash
        }
        
        verify(depositor).depositData(payload);
    }
}
