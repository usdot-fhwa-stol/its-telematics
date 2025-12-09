package com.telematic.telematic_rsu_management_service.health.handler;
import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.health.depositor.UnitStatusDepositor;
import com.telematic.telematic_rsu_management_service.health.dto.TRUHealthStatusMessage;
import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.MessageHandler;
import com.telematic.telematic_rsu_management_service.messaging.Serializer;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class UnitHealthStatusHandler implements MessageHandler {
    private Serializer serializer;
    private UnitStatusDepositor unitStatusDepositor;

    public UnitHealthStatusHandler(Serializer serializer, UnitStatusDepositor unitStatusDepositor) {
        this.serializer = serializer;
        this.unitStatusDepositor = unitStatusDepositor;
    }
    @Override
    public void onMessage(Message message) {        
        byte[] payload = message.payload();
        TRUHealthStatusMessage truHealthStatusMessage = serializer.decode(payload, TRUHealthStatusMessage.class);
        log.info("Handling Unit Health Status Message: {}", truHealthStatusMessage);
        unitStatusDepositor.depositUnitStatus(truHealthStatusMessage);
    }
    
}