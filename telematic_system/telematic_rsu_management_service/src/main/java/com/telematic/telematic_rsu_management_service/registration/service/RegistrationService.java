package com.telematic.telematic_rsu_management_service.registration.service;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.MessagingClient;
import com.telematic.telematic_rsu_management_service.messaging.Serializer;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.registration.depositor.TRUConfigMessageDepositor;
import com.telematic.telematic_rsu_management_service.registration.dto.TruConfigMessage;
import com.telematic.telematic_rsu_management_service.registration.handler.TRUAutoConfigMessageHandler;
import com.telematic.telematic_rsu_management_service.repository.mysql.TRUConfigStatusRepository;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class RegistrationService {

    private final MessagingClient messagingClient;
    private final TRUAutoConfigMessageHandler truAutoConfigMessageHandler;
    private final TRUConfigMessageDepositor truConfigMessageDepositor;
    private final TRUConfigStatusRepository truConfigStatusRepository;
    private final Serializer serializer;
    
    public RegistrationService(MessagingClient messagingClient, TRUAutoConfigMessageHandler truAutoConfigMessageHandler, Serializer serializer, TRUConfigMessageDepositor truConfigMessageDepositor, TRUConfigStatusRepository truConfigStatusRepository) {
        this.messagingClient = messagingClient;
        this.truAutoConfigMessageHandler = truAutoConfigMessageHandler;
        this.serializer = serializer;
        this.truConfigMessageDepositor = truConfigMessageDepositor;
        this.truConfigStatusRepository = truConfigStatusRepository;
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
        truConfigMessageDepositor.processTruConfigMessage(truConfigMessage);
        return message;
    }

    public void subscribeTruConfig(String subject) {
        log.info("Subscribing to TRU auto configuration on subject: '{}'", subject);
        messagingClient.subscribe(subject, truAutoConfigMessageHandler);
    }
    
    public List<TRUConfigStatus> getAllTruConfigs() {
        return truConfigStatusRepository.findAll();
    }
}
