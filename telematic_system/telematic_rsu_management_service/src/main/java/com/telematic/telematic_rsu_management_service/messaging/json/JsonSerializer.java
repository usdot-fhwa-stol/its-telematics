package com.telematic.telematic_rsu_management_service.messaging.json;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.telematic.telematic_rsu_management_service.messaging.Serializer;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Component("jsonSerializer")
@Primary
public class JsonSerializer implements Serializer {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public <T> byte[] encode(T obj) {
        try {
            return objectMapper.writeValueAsBytes(obj);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to encode JSON", e);
        }
    }

    @Override
    public <T> T decode(byte[] data, Class<T> type) {
        try {
            return objectMapper.readValue(data, type);
        } catch (Exception e) {
            throw new RuntimeException("Failed to decode JSON", e);
        }
    }
}
