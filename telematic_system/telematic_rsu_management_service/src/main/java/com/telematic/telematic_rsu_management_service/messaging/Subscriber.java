package com.telematic.telematic_rsu_management_service.messaging;

public interface Subscriber {
    Subscription subscribe(String subject, MessageHandler handler);
}
