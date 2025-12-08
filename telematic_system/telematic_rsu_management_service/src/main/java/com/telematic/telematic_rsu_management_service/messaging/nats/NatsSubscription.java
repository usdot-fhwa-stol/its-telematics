package com.telematic.telematic_rsu_management_service.messaging.nats;

import com.telematic.telematic_rsu_management_service.messaging.Subscription;

public class NatsSubscription implements Subscription{
    private volatile boolean active = true;

    @Override
    public void close() {
        active = false;
    }

    @Override
    public boolean isActive() {
        return active;
    }
}
