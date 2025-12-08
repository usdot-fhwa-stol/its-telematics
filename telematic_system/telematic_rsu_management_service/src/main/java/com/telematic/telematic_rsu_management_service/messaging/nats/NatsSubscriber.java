package com.telematic.telematic_rsu_management_service.messaging.nats;

import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.MessageHandler;
import com.telematic.telematic_rsu_management_service.messaging.Subscriber;
import io.nats.client.Connection;
import io.nats.client.Dispatcher;
import io.nats.client.impl.Headers;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import jakarta.annotation.PreDestroy;

@Component
@ConditionalOnProperty(prefix = "messaging.nats", name = "enabled", havingValue = "true", matchIfMissing = false)
public class NatsSubscriber implements Subscriber {

    private final Connection connection;
    private Dispatcher dispatcher;
    private final Set<String> subscribedSubjects = ConcurrentHashMap.newKeySet();

    public NatsSubscriber(Connection connection) {
        this.connection = connection;
    }

    @Override
    public NatsSubscription subscribe(String subject, MessageHandler handler) {
        if (connection == null) {
            return new NatsSubscription();
        }
        if (dispatcher == null) {
            dispatcher = connection.createDispatcher(msg -> {
                byte[] data = msg.getData();
                Map<String,String> headers = new HashMap<>();
                Headers h = msg.getHeaders();
                if (h != null) {
                    h.keySet().forEach(k -> {
                        List<String> values = h.get(k);
                        headers.put(k, values == null ? "" : String.join(",", values));
                    });
                }
                if (handler != null) {
                    handler.onMessage(new Message(msg.getSubject(), data, headers));
                }
            });
        }
        dispatcher.subscribe(subject);
        subscribedSubjects.add(subject);
        return new NatsSubscription();
    }

    @PreDestroy
    public void shutdown() {
        if (dispatcher != null) {
            subscribedSubjects.forEach(s -> {
                try {
                    dispatcher.unsubscribe(s);
                } catch (Exception ignored) {
                }
            });
        }
    }
}
