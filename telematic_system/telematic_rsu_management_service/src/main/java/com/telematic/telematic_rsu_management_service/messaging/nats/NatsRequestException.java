package com.telematic.telematic_rsu_management_service.messaging.nats;

public class NatsRequestException extends RuntimeException {

    public NatsRequestException(String message, Throwable cause) {
        super(message, cause);
    }
}
