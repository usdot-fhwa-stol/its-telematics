package com.telematic.telematic_rsu_management_service.messaging;

import java.time.Duration;
import java.util.Map;

public interface MessagingClient {
    void publish(String subject, byte[] payload, Map<String, String> headers);
    Message request(String subject, byte[] payload, Duration timeout);
    Subscription subscribe(String subject, MessageHandler handler);
}
