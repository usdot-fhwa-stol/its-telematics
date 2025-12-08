package com.telematic.telematic_rsu_management_service.registration.handler;

import com.telematic.telematic_rsu_management_service.messaging.Serializer;
import com.telematic.telematic_rsu_management_service.registration.depositor.TruConfigMessageDepositor;
import com.telematic.telematic_rsu_management_service.registration.dto.TruConfigMessage;
import com.telematic.telematic_rsu_management_service.registration.repository.TRUConfigStatusRepository;
import com.telematic.telematic_rsu_management_service.registration.service.RegistrationService;

import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Component;
import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.MessageHandler;

@Component
@Slf4j
public class TruConfigMessageHandler implements MessageHandler {
    private final Serializer serializer;
    private final TruConfigMessageDepositor registrationDepositor;

    public TruConfigMessageHandler(Serializer serializer, TruConfigMessageDepositor registrationDepositor) {
        this.serializer = serializer;
        this.registrationDepositor = registrationDepositor;
    }
    
    @Override
    public void onMessage(Message message) {
        byte[] payload = message.payload();
        TruConfigMessage configMessage = serializer.decode(payload, TruConfigMessage.class);
        log.info("Automatic TRU Config Message received: {}", configMessage);
        registrationDepositor.processAutoTruConfigMessage(configMessage);
    }    
}
