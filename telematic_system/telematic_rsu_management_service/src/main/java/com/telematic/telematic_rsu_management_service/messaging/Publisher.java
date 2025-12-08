package com.telematic.telematic_rsu_management_service.messaging;

import java.util.Map;

public interface Publisher {
    void publish(String subject, byte[] payload, Map<String, String> headers);
}
