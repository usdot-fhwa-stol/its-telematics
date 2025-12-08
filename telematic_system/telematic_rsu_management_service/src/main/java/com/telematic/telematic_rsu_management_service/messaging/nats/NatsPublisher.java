package com.telematic.telematic_rsu_management_service.messaging.nats;

import com.telematic.telematic_rsu_management_service.messaging.Publisher;
import io.nats.client.Connection;
import io.nats.client.impl.Headers;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@Component
@ConditionalOnProperty(prefix = "messaging.nats", name = "enabled", havingValue = "true", matchIfMissing = false)
public class NatsPublisher implements Publisher {

    private final Connection connection;

    public NatsPublisher(Connection connection) {
        this.connection = connection;
    }

    @Override
    public void publish(String subject, byte[] payload, Map<String, String> headers) {
        if (connection == null) {
            return; // no-op if not wired yet
        }
        Headers h = null;
        if (headers != null && !headers.isEmpty()) {
            h = new Headers();
            headers.forEach(h::add);
        }
        connection.publish(subject, h, payload);
    }
}
