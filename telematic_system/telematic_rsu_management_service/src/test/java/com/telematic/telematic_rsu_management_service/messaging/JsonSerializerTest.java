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
package com.telematic.telematic_rsu_management_service.messaging;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.test.context.ActiveProfiles;

import com.telematic.telematic_rsu_management_service.messaging.json.JsonSerializer;

@ActiveProfiles("test")
class JsonSerializerTest {

    private final JsonSerializer serializer = new JsonSerializer();

    @Test
    void testSerialize_WithValidObject_ShouldReturnJson() {
        // Given
        TestObject obj = new TestObject("test", 123);

        // When
        byte[] result = serializer.encode(obj);

        // Then
        assertNotNull(result);
        String jsonString = new String(result);
        assertTrue(jsonString.contains("\"name\":\"test\""));
        assertTrue(jsonString.contains("\"value\":123"));
    }

    @Test
    void testDeserialize_WithValidJson_ShouldReturnObject() {
        // Given
        String json = "{\"name\":\"test\",\"value\":123}";

        // When
        TestObject result = serializer.decode(json.getBytes(), TestObject.class);

        // Then
        assertNotNull(result);
        assertEquals("test", result.name);
        assertEquals(123, result.value);
    }

    @Test
    void testSerialize_WithNull_ShouldReturnNullBytes() {
        // Given/When
        byte[] result = serializer.encode(null);

        // Then
        assertNotNull(result);
        assertEquals("null", new String(result));
    }

    @Test
    void testDeserialize_WithInvalidJson_ShouldThrowException() {
        // Given
        String invalidJson = "{invalid json}";

        // When/Then
        assertThrows(RuntimeException.class, 
            () -> serializer.decode(invalidJson.getBytes(), TestObject.class));
    }

    @Test
    void testDeserialize_WithEmptyJson_ShouldThrowException() {
        // Given
        String emptyJson = "";

        // When/Then
        assertThrows(RuntimeException.class, 
            () -> serializer.decode(emptyJson.getBytes(), TestObject.class));
    }

    @Test
    void testSerialize_WithNestedObject_ShouldSerializeCorrectly() {
        // Given
        NestedObject nested = new NestedObject("outer", new TestObject("inner", 456));

        // When
        byte[] result = serializer.encode(nested);

        // Then
        assertNotNull(result);
        String jsonString = new String(result);
        assertTrue(jsonString.contains("\"outer\":\"outer\""));
        assertTrue(jsonString.contains("\"name\":\"inner\""));
        assertTrue(jsonString.contains("\"value\":456"));
    }

    @Test
    void testDeserialize_WithNestedJson_ShouldDeserializeCorrectly() {
        // Given
        String json = "{\"outer\":\"test\",\"inner\":{\"name\":\"nested\",\"value\":789}}";

        // When
        NestedObject result = serializer.decode(json.getBytes(), NestedObject.class);

        // Then
        assertNotNull(result);
        assertEquals("test", result.outer);
        assertNotNull(result.inner);
        assertEquals("nested", result.inner.name);
        assertEquals(789, result.inner.value);
    }

    // Test classes
    static class TestObject {
        public String name;
        public int value;

        public TestObject() {}

        public TestObject(String name, int value) {
            this.name = name;
            this.value = value;
        }
    }

    static class NestedObject {
        public String outer;
        public TestObject inner;

        public NestedObject() {}

        public NestedObject(String outer, TestObject inner) {
            this.outer = outer;
            this.inner = inner;
        }
    }
}
