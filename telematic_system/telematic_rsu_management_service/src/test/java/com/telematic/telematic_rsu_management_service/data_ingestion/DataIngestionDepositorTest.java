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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;

import com.telematic.telematic_rsu_management_service.data_ingestion.depositor.DataIngestionDepositor;
import com.telematic.telematic_rsu_management_service.data_ingestion.influx.InfluxLineBuilder;
import com.telematic.telematic_rsu_management_service.repository.influx.InfluxDBRepository;

@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
class DataIngestionDepositorTest {

    @Mock
    private InfluxDBRepository influxDBRepository;

    @Mock
    private InfluxLineBuilder influxLineBuilder;

    private DataIngestionDepositor depositor;

    @BeforeEach
    void setUp() {
        depositor = new DataIngestionDepositor(influxDBRepository, influxLineBuilder);
        ReflectionTestUtils.setField(depositor, "batchSize", 10);
        ReflectionTestUtils.setField(depositor, "flushIntervalMs", 50L);
        ReflectionTestUtils.setField(depositor, "queueCapacity", 100);
    }

    @AfterEach
    void tearDown() {
        if (depositor != null) {
            depositor.destroy();
        }
    }

    @Test
    void testInit_ShouldStartWriterThread() {
        // When
        depositor.init();

        // Then
        assertNotNull(ReflectionTestUtils.getField(depositor, "queue"));
        assertNotNull(ReflectionTestUtils.getField(depositor, "writerThread"));
        Thread writerThread = (Thread) ReflectionTestUtils.getField(depositor, "writerThread");
        assertTrue(writerThread.isAlive());
        assertTrue(writerThread.getName().startsWith("influx-batch-writer-"));
    }

    @Test
    void testDepositData_ShouldEnqueueMessage() throws Exception {
        // Given
        depositor.init();
        String json = "{\"test\": \"data\"}";
        String line = "measurement,tag=value field=1 123456789";
        when(influxLineBuilder.buildLine(json)).thenReturn(line);

        // When
        depositor.depositData(json);

        // Then
        verify(influxLineBuilder).buildLine(json);
        Thread.sleep(100); // Allow processing
    }

    @Test
    void testDepositData_WithBuildLineException_ShouldThrowRuntimeException() throws Exception {
        // Given
        depositor.init();
        String json = "{\"invalid\": \"data\"}";
        when(influxLineBuilder.buildLine(json)).thenThrow(new RuntimeException("Parse error"));

        // When/Then
        assertThrows(RuntimeException.class, () -> depositor.depositData(json));
    }

    @Test
    void testWriterLoop_ShouldBatchAndWrite() throws Exception {
        // Given
        depositor.init();
        String json1 = "{\"test\": \"data1\"}";
        String json2 = "{\"test\": \"data2\"}";
        String line1 = "measurement field=1 123";
        String line2 = "measurement field=2 456";
        
        when(influxLineBuilder.buildLine(json1)).thenReturn(line1);
        when(influxLineBuilder.buildLine(json2)).thenReturn(line2);

        // When
        depositor.depositData(json1);
        depositor.depositData(json2);
        Thread.sleep(200); // Wait for batch processing

        // Then
        ArgumentCaptor<List<String>> batchCaptor = ArgumentCaptor.forClass(List.class);
        verify(influxDBRepository, atLeastOnce()).writeBatch(batchCaptor.capture());
        
        List<List<String>> allBatches = batchCaptor.getAllValues();
        assertTrue(allBatches.size() > 0);
    }

    @Test
    void testDestroy_ShouldStopThreadAndFlushQueue() throws Exception {
        // Given
        depositor.init();
        String json = "{\"test\": \"data\"}";
        String line = "measurement field=1 123";
        when(influxLineBuilder.buildLine(json)).thenReturn(line);
        depositor.depositData(json);

        // When
        depositor.destroy();
        Thread.sleep(100);

        // Then
        Thread writerThread = (Thread) ReflectionTestUtils.getField(depositor, "writerThread");
        assertFalse((Boolean) ReflectionTestUtils.getField(depositor, "running"));
    }

    @Test
    void testMultipleMessages_ShouldRespectBatchSize() throws Exception {
        // Given
        ReflectionTestUtils.setField(depositor, "batchSize", 5);
        depositor.init();
        
        when(influxLineBuilder.buildLine(anyString())).thenAnswer(invocation -> 
            "measurement field=1 " + System.currentTimeMillis()
        );

        // When - Send 12 messages
        for (int i = 0; i < 12; i++) {
            depositor.depositData("{\"id\": " + i + "}");
        }
        Thread.sleep(300); // Wait for batches to process

        // Then
        ArgumentCaptor<List<String>> batchCaptor = ArgumentCaptor.forClass(List.class);
        verify(influxDBRepository, atLeast(2)).writeBatch(batchCaptor.capture());
    }
}
