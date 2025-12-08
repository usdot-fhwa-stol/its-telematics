package com.telematic.telematic_rsu_management_service.messaging.nats;

import io.nats.client.Connection;
import io.nats.client.ErrorListener;
import io.nats.client.Nats;
import io.nats.client.Options;

import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@Configuration
public class NatsConnectionConfig {

    private static final Logger log = LoggerFactory.getLogger(NatsConnectionConfig.class);

    @Value("${messaging.nats.uri:nats://localhost:4222}")
    private String uri;
    @Value("${messaging.nats.max-reconnect-attempts:30}")
    private int maxReconnects;

    @Value("${messaging.nats.reconnect-wait-millis:6000}")
    private int connectionTimeout;

    @Bean(destroyMethod = "close")
    @ConditionalOnProperty(prefix = "messaging.nats", name = "enabled", havingValue = "true", matchIfMissing = false)
    public Connection natsConnection(ErrorListener errorListener) throws Exception {
        Options options = new Options.Builder()
                .server(uri)
                .connectionListener((connection, event) -> log.info("Connection Event: " + event))
                .maxReconnects(maxReconnects)
                .connectionTimeout(Duration.ofMillis(connectionTimeout))
                .errorListener(errorListener)
                .build();

        return Nats.connect(options);
    }

    @Bean
    public ErrorListener natsErrorListener() {
        return new ErrorListener() {
            @Override
            public void errorOccurred(Connection conn, String error) {
                log.error("NATS error occurred: {}", error);
            }

            @Override
            public void exceptionOccurred(Connection conn, Exception exp) {
                log.error("NATS exception occurred", exp);
            }
        };
    }
}
