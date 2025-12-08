package com.telematic.telematic_rsu_management_service.messaging.nats;

import java.util.concurrent.CancellationException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.Requester;

import io.nats.client.Connection;

@Component
public class NatsRequester implements Requester {
    private final Connection connection;

    public NatsRequester(Connection connection) {
        this.connection = connection;
    }

    @Override
    public Message request(String subject, byte[] payload, java.time.Duration timeout) {
        try{
            CompletableFuture<io.nats.client.Message> future = connection.requestWithTimeout(subject, payload, timeout);
            return new Message(subject, future.get(timeout.toSeconds(), TimeUnit.SECONDS).getData(), null);
        }catch(ExecutionException | InterruptedException | CancellationException | TimeoutException e){
            throw new RuntimeException("Failed to get response from NATS request", e);
        }       
    }
    
}
