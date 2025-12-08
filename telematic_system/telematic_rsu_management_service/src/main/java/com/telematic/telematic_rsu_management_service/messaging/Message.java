package com.telematic.telematic_rsu_management_service.messaging;

import java.util.Map;

public record Message(String subject, byte[] payload, Map<String, String> headers) {}
