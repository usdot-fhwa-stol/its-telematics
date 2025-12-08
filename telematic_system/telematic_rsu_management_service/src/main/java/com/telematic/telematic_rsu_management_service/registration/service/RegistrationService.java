package com.telematic.telematic_rsu_management_service.registration.service;

import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.MessagingClient;
import com.telematic.telematic_rsu_management_service.messaging.Serializer;
import com.telematic.telematic_rsu_management_service.model.RSUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.TRUPluginConfigStatus;
import com.telematic.telematic_rsu_management_service.registration.depositor.TruConfigMessageDepositor;
import com.telematic.telematic_rsu_management_service.registration.dto.RsuConfigItemMessage;
import com.telematic.telematic_rsu_management_service.registration.dto.TruConfigMessage;
import com.telematic.telematic_rsu_management_service.registration.handler.TruConfigMessageHandler;
import com.telematic.telematic_rsu_management_service.registration.repository.TRUConfigStatusRepository;

import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class RegistrationService {

    private final MessagingClient messagingClient;
    private final TruConfigMessageHandler truConfigMessageHandler;
    private final TruConfigMessageDepositor registrationDepositor;
    private final Serializer serializer;
    
    public RegistrationService(MessagingClient messagingClient, TruConfigMessageHandler truConfigMessageHandler, Serializer serializer, TruConfigMessageDepositor registrationDepositor ) {
        this.messagingClient = messagingClient;
        this.truConfigMessageHandler = truConfigMessageHandler;
        this.serializer = serializer;
        this.registrationDepositor = registrationDepositor;
    }

    public void publishTruConfig(String subject, TruConfigMessage message) {
        byte[] payload = serializer.encode(message);
        Map<String, String> headers = new HashMap<>();
        headers.put("content-type", "application/json");
        messagingClient.publish(subject, payload, headers);
    }

    public Message requestTruConfig(String truConfigSubject, TruConfigMessage truConfigMessage, long timeout) {
        byte[] payload = serializer.encode(truConfigMessage);
        log.info("Request for RSU configuration update on subject '{}': {}", truConfigSubject, truConfigMessage);
        Message message = messagingClient.request(truConfigSubject, payload, Duration.ofSeconds(timeout));
        registrationDepositor.processTruConfigMessage(truConfigMessage);
        return message;
    }

    public void subscribeTruConfig(String subject) {
        log.info("Subscribing to TRU config messages on subject '{}'", subject);
        messagingClient.subscribe(subject, truConfigMessageHandler);
    }
    
    public List<TRUConfigStatus> getAllTruConfigs() {
        return registrationDepositor.getAllTruConfigs();
    }
}
