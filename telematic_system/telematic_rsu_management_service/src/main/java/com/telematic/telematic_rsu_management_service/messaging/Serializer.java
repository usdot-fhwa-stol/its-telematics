package com.telematic.telematic_rsu_management_service.messaging;

public interface Serializer {
    <T> byte[] encode(T obj);
    <T> T decode(byte[] data, Class<T> type);
}
