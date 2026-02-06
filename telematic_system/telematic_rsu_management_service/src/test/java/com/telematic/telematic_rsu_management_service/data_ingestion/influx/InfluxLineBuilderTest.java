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
package com.telematic.telematic_rsu_management_service.data_ingestion.influx;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.telematic.telematic_rsu_management_service.data_ingestion.influx.pipeline.LineRecordContext;

@ExtendWith(MockitoExtension.class)
class InfluxLineBuilderTest {

    @Mock
    private InfluxPipelineLineBuilder pipelineLineBuilder;

    private InfluxLineBuilder influxLineBuilder;

    @BeforeEach
    void setUp() {
        influxLineBuilder = new InfluxLineBuilder(pipelineLineBuilder);
    }

    @Test
    void testBuildLine_withValidJsonAndAllFields() throws Exception {
        // Given
        String json = """
            {
                "metadata": {
                    "event": "test_event",
                    "unitId": "unit123",
                    "rsu": {
                        "ip": "192.168.1.1",
                        "port": "8080"
                    },
                    "topicName": "test/topic",
                    "timestamp": 1234567890000000000
                },
                "payload": {
                    "temperature": 25.5,
                    "status": "active"
                }
            }
            """;

        when(pipelineLineBuilder.build(any(LineRecordContext.class)))
            .thenReturn("test_event,unit123,192.168.1.1,test/topic,8080 payload.temperature=25.5,payload.status=active 1234567890000000000");

        // When
        String result = influxLineBuilder.buildLine(json);

        // Then
        assertNotNull(result);
        verify(pipelineLineBuilder, times(1)).build(any(LineRecordContext.class));
    }

    @Test
    void testBuildLine_withNestedPayload() throws Exception {
        // Given
        String json = """
            {
                "metadata": {
                    "event": "nested_event",
                    "unitId": "unit456",
                    "rsu": {
                        "ip": "10.0.0.1",
                        "port": "9090"
                    },
                    "topicName": "sensor/data",
                    "timestamp": 1234567890123456789
                },
                "payload": {
                    "sensor": {
                        "temperature": 22.3,
                        "humidity": 65
                    },
                    "location": {
                        "lat": 40.7128,
                        "lon": -74.0060
                    }
                }
            }
            """;

        when(pipelineLineBuilder.build(any(LineRecordContext.class)))
            .thenAnswer(invocation -> {
                LineRecordContext ctx = invocation.getArgument(0);
                assertEquals("nested_event", ctx.getMeasurement());
                assertEquals("unit456", ctx.getTags().get("unitId"));
                assertEquals("10.0.0.1", ctx.getTags().get("rsuIp"));
                assertEquals("sensor/data", ctx.getTags().get("topicName"));
                assertEquals("9090", ctx.getTags().get("port"));
                assertTrue(ctx.getFields().containsKey("payload.sensor.temperature"));
                assertTrue(ctx.getFields().containsKey("payload.sensor.humidity"));
                assertTrue(ctx.getFields().containsKey("payload.location.lat"));
                assertTrue(ctx.getFields().containsKey("payload.location.lon"));
                assertEquals(1234567890123456789L, ctx.getTimestamp());
                return "mocked_line";
            });

        // When
        String result = influxLineBuilder.buildLine(json);

        // Then
        assertEquals("mocked_line", result);
        verify(pipelineLineBuilder, times(1)).build(any(LineRecordContext.class));
    }

    @Test
    void testBuildLine_withArrayPayload() throws Exception {
        // Given
        String json = """
            {
                "metadata": {
                    "event": "array_event",
                    "unitId": "unit789",
                    "rsu": {
                        "ip": "172.16.0.1",
                        "port": "7070"
                    },
                    "topicName": "array/data",
                    "timestamp": 1111111111000000000
                },
                "payload": {
                    "values": [10, 20, 30],
                    "names": ["first", "second", "third"]
                }
            }
            """;

        when(pipelineLineBuilder.build(any(LineRecordContext.class)))
            .thenAnswer(invocation -> {
                LineRecordContext ctx = invocation.getArgument(0);
                assertEquals("array_event", ctx.getMeasurement());
                assertTrue(ctx.getFields().containsKey("payload.values[0]"));
                assertTrue(ctx.getFields().containsKey("payload.values[1]"));
                assertTrue(ctx.getFields().containsKey("payload.values[2]"));
                assertTrue(ctx.getFields().containsKey("payload.names[0]"));
                assertTrue(ctx.getFields().containsKey("payload.names[1]"));
                assertTrue(ctx.getFields().containsKey("payload.names[2]"));
                return "mocked_line_with_arrays";
            });

        // When
        String result = influxLineBuilder.buildLine(json);

        // Then
        assertEquals("mocked_line_with_arrays", result);
        verify(pipelineLineBuilder, times(1)).build(any(LineRecordContext.class));
    }

    @Test
    void testBuildLine_withMissingMetadataFields_usesDefaults() throws Exception {
        // Given
        String json = """
            {
                "metadata": {},
                "payload": {
                    "value": 100
                }
            }
            """;

        when(pipelineLineBuilder.build(any(LineRecordContext.class)))
            .thenAnswer(invocation -> {
                LineRecordContext ctx = invocation.getArgument(0);
                assertEquals("unknown", ctx.getMeasurement());
                assertEquals("unknown", ctx.getTags().get("unitId"));
                assertEquals("0.0.0.0", ctx.getTags().get("rsuIp"));
                assertEquals("unknown", ctx.getTags().get("topicName"));
                assertEquals("0", ctx.getTags().get("port"));
                assertEquals(0L, ctx.getTimestamp());
                return "default_line";
            });

        // When
        String result = influxLineBuilder.buildLine(json);

        // Then
        assertEquals("default_line", result);
        verify(pipelineLineBuilder, times(1)).build(any(LineRecordContext.class));
    }

    @Test
    void testBuildLine_withEmptyPayload() throws Exception {
        // Given
        String json = """
            {
                "metadata": {
                    "event": "empty_payload",
                    "unitId": "unit000",
                    "rsu": {
                        "ip": "1.2.3.4",
                        "port": "5000"
                    },
                    "topicName": "empty",
                    "timestamp": 5555555555000000000
                },
                "payload": {}
            }
            """;

        when(pipelineLineBuilder.build(any(LineRecordContext.class)))
            .thenAnswer(invocation -> {
                LineRecordContext ctx = invocation.getArgument(0);
                assertTrue(ctx.getFields().isEmpty());
                return "empty_payload_line";
            });

        // When
        String result = influxLineBuilder.buildLine(json);

        // Then
        assertEquals("empty_payload_line", result);
        verify(pipelineLineBuilder, times(1)).build(any(LineRecordContext.class));
    }

    @Test
    void testBuildLine_withNullPayloadNode() throws Exception {
        // Given
        String json = """
            {
                "metadata": {
                    "event": "null_payload",
                    "unitId": "unit111",
                    "rsu": {
                        "ip": "5.6.7.8",
                        "port": "6000"
                    },
                    "topicName": "null_test",
                    "timestamp": 6666666666000000000
                },
                "payload": null
            }
            """;

        when(pipelineLineBuilder.build(any(LineRecordContext.class)))
            .thenAnswer(invocation -> {
                LineRecordContext ctx = invocation.getArgument(0);
                assertTrue(ctx.getFields().isEmpty());
                return "null_payload_line";
            });

        // When
        String result = influxLineBuilder.buildLine(json);

        // Then
        assertEquals("null_payload_line", result);
        verify(pipelineLineBuilder, times(1)).build(any(LineRecordContext.class));
    }

    @Test
    void testBuildLine_withInvalidJson_throwsException() {
        // Given
        String invalidJson = "{ this is not valid json }";

        // When & Then
        assertThrows(Exception.class, () -> influxLineBuilder.buildLine(invalidJson));
        verify(pipelineLineBuilder, never()).build(any(LineRecordContext.class));
    }

    @Test
    void testBuildLine_withComplexNestedStructure() throws Exception {
        // Given
        String json = """
            {
                "metadata": {
                    "event": "complex_event",
                    "unitId": "complex_unit",
                    "rsu": {
                        "ip": "192.168.100.1",
                        "port": "8888"
                    },
                    "topicName": "complex/topic",
                    "timestamp": 7777777777000000000
                },
                "payload": {
                    "level1": {
                        "level2": {
                            "level3": {
                                "deepValue": "nested"
                            }
                        }
                    },
                    "mixedArray": [
                        {"id": 1, "name": "first"},
                        {"id": 2, "name": "second"}
                    ]
                }
            }
            """;

        when(pipelineLineBuilder.build(any(LineRecordContext.class)))
            .thenAnswer(invocation -> {
                LineRecordContext ctx = invocation.getArgument(0);
                assertTrue(ctx.getFields().containsKey("payload.level1.level2.level3.deepValue"));
                assertTrue(ctx.getFields().containsKey("payload.mixedArray[0].id"));
                assertTrue(ctx.getFields().containsKey("payload.mixedArray[0].name"));
                assertTrue(ctx.getFields().containsKey("payload.mixedArray[1].id"));
                assertTrue(ctx.getFields().containsKey("payload.mixedArray[1].name"));
                return "complex_line";
            });

        // When
        String result = influxLineBuilder.buildLine(json);

        // Then
        assertEquals("complex_line", result);
        verify(pipelineLineBuilder, times(1)).build(any(LineRecordContext.class));
    }

    @Test
    void testBuildLine_tagsArePopulatedCorrectly() throws Exception {
        // Given
        String json = """
            {
                "metadata": {
                    "event": "tag_test",
                    "unitId": "tag_unit",
                    "rsu": {
                        "ip": "10.20.30.40",
                        "port": "1234"
                    },
                    "topicName": "tag/topic",
                    "timestamp": 8888888888000000000
                },
                "payload": {
                    "data": "test"
                }
            }
            """;

        when(pipelineLineBuilder.build(any(LineRecordContext.class)))
            .thenAnswer(invocation -> {
                LineRecordContext ctx = invocation.getArgument(0);
                Map<String, String> tags = ctx.getTags();
                assertEquals(4, tags.size());
                assertEquals("tag_unit", tags.get("unitId"));
                assertEquals("10.20.30.40", tags.get("rsuIp"));
                assertEquals("tag/topic", tags.get("topicName"));
                assertEquals("1234", tags.get("port"));
                return "tag_line";
            });

        // When
        String result = influxLineBuilder.buildLine(json);

        // Then
        assertEquals("tag_line", result);
        verify(pipelineLineBuilder, times(1)).build(any(LineRecordContext.class));
    }
}
