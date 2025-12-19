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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.telematic.telematic_rsu_management_service.data_ingestion.influx.pipeline.LineRecordContext;
import com.telematic.telematic_rsu_management_service.data_ingestion.influx.pipeline.Processor;

@ExtendWith(MockitoExtension.class)
class InfluxPipelineLineBuilderTest {

    @Mock
    private Processor processor1;

    @Mock
    private Processor processor2;

    private InfluxPipelineLineBuilder pipelineLineBuilder;

    @BeforeEach
    void setUp() {
        List<Processor> processors = new ArrayList<>();
        processors.add(processor1);
        processors.add(processor2);
        pipelineLineBuilder = new InfluxPipelineLineBuilder(processors);
    }

    @Test
    void testBuild_withValidContext_processorsAreCalled() {
        // Given
        LineRecordContext ctx = createBasicContext();

        // When
        String result = pipelineLineBuilder.build(ctx);

        // Then
        verify(processor1, times(1)).process(ctx);
        verify(processor2, times(1)).process(ctx);
        assertNotNull(result);
    }

    @Test
    void testBuild_withBasicContext_createsCorrectLineFormat() {
        // Given
        LineRecordContext ctx = new LineRecordContext();
        ctx.setMeasurement("test_measurement");
        
        Map<String, String> tags = new LinkedHashMap<>();
        tags.put("tag1", "value1");
        tags.put("tag2", "value2");
        ctx.setTags(tags);
        
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("field1", "100");
        fields.put("field2", "200");
        ctx.setFields(fields);
        
        ctx.setTimestamp(1234567890000000000L);

        // When
        String result = pipelineLineBuilder.build(ctx);

        // Then
        assertTrue(result.startsWith("test_measurement"));
        assertTrue(result.contains("field1=100"));
        assertTrue(result.contains("field2=200"));
        assertTrue(result.endsWith("1234567890000000000"));
    }

    @Test
    void testBuild_withNoTimestamp_omitsTimestamp() {
        // Given
        LineRecordContext ctx = new LineRecordContext();
        ctx.setMeasurement("no_timestamp_measurement");
        
        Map<String, String> tags = new LinkedHashMap<>();
        tags.put("tag", "value");
        ctx.setTags(tags);
        
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("field", "data");
        ctx.setFields(fields);
        
        ctx.setTimestamp(null);

        // When
        String result = pipelineLineBuilder.build(ctx);

        // Then
        assertTrue(result.startsWith("no_timestamp_measurement"));
        assertTrue(result.contains("field=data"));
        assertFalse(result.matches(".*\\s+\\d+$")); // No trailing timestamp
    }

    @Test
    void testBuild_withMultipleTags_includesAllTags() {
        // Given
        LineRecordContext ctx = new LineRecordContext();
        ctx.setMeasurement("multi_tag_measurement");
        
        Map<String, String> tags = new LinkedHashMap<>();
        tags.put("unitId", "unit123");
        tags.put("rsuIp", "192.168.1.1");
        tags.put("topicName", "test/topic");
        tags.put("port", "8080");
        ctx.setTags(tags);
        
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("value", "test");
        ctx.setFields(fields);

        // When
        String result = pipelineLineBuilder.build(ctx);

        // Then
        assertTrue(result.contains("unit123"));
        assertTrue(result.contains("192.168.1.1"));
        assertTrue(result.contains("test/topic"));
        assertTrue(result.contains("8080"));
    }

    @Test
    void testBuild_withMultipleFields_includesAllFields() {
        // Given
        LineRecordContext ctx = new LineRecordContext();
        ctx.setMeasurement("multi_field_measurement");
        
        Map<String, String> tags = new LinkedHashMap<>();
        tags.put("tag", "value");
        ctx.setTags(tags);
        
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("temperature", "25.5");
        fields.put("humidity", "65");
        fields.put("pressure", "1013.25");
        fields.put("status", "active");
        ctx.setFields(fields);

        // When
        String result = pipelineLineBuilder.build(ctx);

        // Then
        assertTrue(result.contains("temperature=25.5"));
        assertTrue(result.contains("humidity=65"));
        assertTrue(result.contains("pressure=1013.25"));
        assertTrue(result.contains("status=active"));
    }

    @Test
    void testBuild_withNullMeasurement_throwsException() {
        // Given
        LineRecordContext ctx = new LineRecordContext();
        ctx.setMeasurement(null);
        
        Map<String, String> tags = new LinkedHashMap<>();
        tags.put("tag", "value");
        ctx.setTags(tags);
        
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("field", "data");
        ctx.setFields(fields);

        // When & Then
        assertThrows(IllegalArgumentException.class, () -> pipelineLineBuilder.build(ctx));
    }

    @Test
    void testBuild_withEmptyMeasurement_throwsException() {
        // Given
        LineRecordContext ctx = new LineRecordContext();
        ctx.setMeasurement("");
        
        Map<String, String> tags = new LinkedHashMap<>();
        tags.put("tag", "value");
        ctx.setTags(tags);
        
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("field", "data");
        ctx.setFields(fields);

        // When & Then
        assertThrows(IllegalArgumentException.class, () -> pipelineLineBuilder.build(ctx));
    }

    @Test
    void testBuild_withEmptyProcessorList_stillBuildsLine() {
        // Given
        List<Processor> emptyProcessors = new ArrayList<>();
        InfluxPipelineLineBuilder builder = new InfluxPipelineLineBuilder(emptyProcessors);
        LineRecordContext ctx = createBasicContext();

        // When
        String result = builder.build(ctx);

        // Then
        assertNotNull(result);
        assertTrue(result.startsWith("test_measurement"));
    }

    @Test
    void testBuild_processorsExecuteInOrder() {
        // Given
        List<String> executionOrder = new ArrayList<>();
        
        Processor p1 = ctx -> executionOrder.add("processor1");
        Processor p2 = ctx -> executionOrder.add("processor2");
        Processor p3 = ctx -> executionOrder.add("processor3");
        
        List<Processor> orderedProcessors = List.of(p1, p2, p3);
        InfluxPipelineLineBuilder builder = new InfluxPipelineLineBuilder(orderedProcessors);
        LineRecordContext ctx = createBasicContext();

        // When
        builder.build(ctx);

        // Then
        assertEquals(3, executionOrder.size());
        assertEquals("processor1", executionOrder.get(0));
        assertEquals("processor2", executionOrder.get(1));
        assertEquals("processor3", executionOrder.get(2));
    }

    @Test
    void testBuild_processorModifiesContext_changesReflectedInOutput() {
        // Given
        Processor modifyingProcessor = ctx -> {
            ctx.setMeasurement("modified_measurement");
            ctx.getTags().put("newTag", "newValue");
            ctx.getFields().put("newField", "newData");
        };
        
        List<Processor> processors = List.of(modifyingProcessor);
        InfluxPipelineLineBuilder builder = new InfluxPipelineLineBuilder(processors);
        LineRecordContext ctx = createBasicContext();

        // When
        String result = builder.build(ctx);

        // Then
        assertTrue(result.startsWith("modified_measurement"));
        assertTrue(result.contains("newValue"));
        assertTrue(result.contains("newField=newData"));
    }

    @Test
    void testBuild_withSpecialCharactersInFieldValues() {
        // Given
        LineRecordContext ctx = new LineRecordContext();
        ctx.setMeasurement("special_chars");
        
        Map<String, String> tags = new LinkedHashMap<>();
        tags.put("tag", "normal");
        ctx.setTags(tags);
        
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("field1", "value with spaces");
        fields.put("field2", "value,with,commas");
        fields.put("field3", "value=with=equals");
        ctx.setFields(fields);

        // When
        String result = pipelineLineBuilder.build(ctx);

        // Then
        assertNotNull(result);
        assertTrue(result.contains("field1=value with spaces"));
        assertTrue(result.contains("field2=value,with,commas"));
        assertTrue(result.contains("field3=value=with=equals"));
    }

    @Test
    void testBuild_fieldsSeparatedByComma() {
        // Given
        LineRecordContext ctx = new LineRecordContext();
        ctx.setMeasurement("comma_test");
        
        Map<String, String> tags = new LinkedHashMap<>();
        tags.put("tag", "value");
        ctx.setTags(tags);
        
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("field1", "val1");
        fields.put("field2", "val2");
        fields.put("field3", "val3");
        ctx.setFields(fields);

        // When
        String result = pipelineLineBuilder.build(ctx);

        // Then
        assertTrue(result.contains("field1=val1,field2=val2,field3=val3"));
    }

    @Test
    void testBuild_tagsFormattedAsCommaDelimitedValues() {
        // Given
        LineRecordContext ctx = new LineRecordContext();
        ctx.setMeasurement("tag_format_test");
        
        Map<String, String> tags = new LinkedHashMap<>();
        tags.put("tag1", "tagval1");
        tags.put("tag2", "tagval2");
        tags.put("tag3", "tagval3");
        ctx.setTags(tags);
        
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("field", "data");
        ctx.setFields(fields);

        // When
        String result = pipelineLineBuilder.build(ctx);

        // Then
        String[] parts = result.split(" ");
        assertTrue(parts[0].contains(",tagval1,tagval2,tagval3"));
    }

    private LineRecordContext createBasicContext() {
        LineRecordContext ctx = new LineRecordContext();
        ctx.setMeasurement("test_measurement");
        
        Map<String, String> tags = new LinkedHashMap<>();
        tags.put("tag1", "value1");
        ctx.setTags(tags);
        
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("field1", "data1");
        ctx.setFields(fields);
        
        ctx.setTimestamp(1000000000000000000L);
        
        return ctx;
    }
}
