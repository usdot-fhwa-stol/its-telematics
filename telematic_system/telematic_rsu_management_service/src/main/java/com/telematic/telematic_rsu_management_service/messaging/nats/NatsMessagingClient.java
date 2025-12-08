package com.telematic.telematic_rsu_management_service.messaging.nats;


import com.telematic.telematic_rsu_management_service.messaging.MessagingClient;
import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.MessageHandler;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;

@Component
@Primary
@ConditionalOnProperty(prefix = "messaging.nats", name = "enabled", havingValue = "true", matchIfMissing = false)
public class NatsMessagingClient implements MessagingClient {
    private NatsPublisher publisher;
    private NatsRequester natsRequester;
    private NatsSubscriber subscriber;

    public NatsMessagingClient(NatsPublisher publisher, NatsSubscriber subscriber, NatsRequester natsRequester) {
        this.publisher = publisher;
        this.subscriber = subscriber;
        this.natsRequester = natsRequester;
    }

	@Override
    public void publish(String subject, byte[] payload, java.util.Map<String, String> headers) {
        publisher.publish(subject, payload, headers);
    }

    @Override
    public Message request(String subject, byte[] payload, java.time.Duration timeout) {
        return natsRequester.request(subject, payload, timeout);
    }

    @Override
    public NatsSubscription subscribe(String subject, MessageHandler handler) {
        return subscriber.subscribe(subject, handler);
    }
}
