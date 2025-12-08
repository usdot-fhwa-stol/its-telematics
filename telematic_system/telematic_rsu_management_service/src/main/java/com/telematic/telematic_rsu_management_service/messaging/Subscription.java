package com.telematic.telematic_rsu_management_service.messaging;

public interface Subscription extends AutoCloseable {
    @Override
    void close();
    boolean isActive();
}
