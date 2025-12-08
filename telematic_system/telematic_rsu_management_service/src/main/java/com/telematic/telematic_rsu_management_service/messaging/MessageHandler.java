package com.telematic.telematic_rsu_management_service.messaging;

@FunctionalInterface
public interface MessageHandler {
    void onMessage(Message message);
}
