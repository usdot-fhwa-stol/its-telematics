package com.telematic.telematic_rsu_management_service.messaging;

public interface Requester {
    public Message request(String subject, byte[] payload, java.time.Duration timeout);
}
