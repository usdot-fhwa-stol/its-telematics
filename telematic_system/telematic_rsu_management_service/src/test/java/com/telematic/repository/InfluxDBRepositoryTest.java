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
package com.telematic.repository;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClient;

import com.influxdb.v3.client.InfluxDBClient;
import com.influxdb.v3.client.write.WriteOptions;
import com.telematic.telematic_rsu_management_service.repository.influx.InfluxDBRepository;

@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
class InfluxDBRepositoryTest {

    @Mock
    private InfluxDBClient influxClient;

    @Mock
    private WebClient influxWebClient;

    private InfluxDBRepository repository;

    @BeforeEach
    void setUp() {
        repository = new InfluxDBRepository(influxClient, influxWebClient);
        ReflectionTestUtils.setField(repository, "database", "test_db");
        ReflectionTestUtils.setField(repository, "token", "test-token");
    }

    @Test
    void testWriteBatch_WithValidLines_ShouldSucceed() {
        // Given
        List<String> lines = Arrays.asList(
            "measurement,tag=value1 field=1 123456",
            "measurement,tag=value2 field=2 123457"
        );

        // When
        repository.writeBatch(lines);

        // Then
        verify(influxClient).writeRecord(anyString(), any(WriteOptions.class));
    }

    @Test
    void testWriteBatch_WithEmptyList_ShouldNotWrite() {
        // Given
        List<String> lines = Arrays.asList();

        // When
        repository.writeBatch(lines);

        // Then
        verify(influxClient, never()).writeRecord(anyString(), any(WriteOptions.class));
    }

    @Test
    void testWriteBatch_WithSingleLine_ShouldWriteWithoutNewline() {
        // Given
        List<String> lines = Arrays.asList("measurement,tag=value field=1 123456");

        // When
        repository.writeBatch(lines);

        // Then
        verify(influxClient).writeRecord(eq("measurement,tag=value field=1 123456"), any(WriteOptions.class));
    }

    @Test
    void testWriteBatch_WithMultipleLines_ShouldJoinWithNewlines() {
        // Given
        List<String> lines = Arrays.asList(
            "line1",
            "line2",
            "line3"
        );

        // When
        repository.writeBatch(lines);

        // Then
        verify(influxClient).writeRecord(eq("line1\nline2\nline3"), any(WriteOptions.class));
    }

    @Test
    void testWriteBatch_WithClientException_ShouldThrowRuntimeException() {
        // Given
        List<String> lines = Arrays.asList("measurement field=1");
        doThrow(new RuntimeException("Write failed")).when(influxClient)
            .writeRecord(anyString(), any(WriteOptions.class));

        // When/Then
        assertThrows(RuntimeException.class, () -> repository.writeBatch(lines));
    }
}
