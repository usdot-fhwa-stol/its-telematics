package com.telematic.telematic_rsu_management_service.health.handler;
import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.health.depositor.RSUHealthStatusDepositor;
import com.telematic.telematic_rsu_management_service.health.dto.TRUHealthStatusMessage;
import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.MessageHandler;
import com.telematic.telematic_rsu_management_service.messaging.Serializer;

@Component
public class RSUHealthStatusHandler implements MessageHandler {
    private Serializer serializer;
    private RSUHealthStatusDepositor rsuHealthStatusDepositor;

    public RSUHealthStatusHandler(Serializer serializer, RSUHealthStatusDepositor rsuHealthStatusDepositor) {
        this.serializer = serializer;
        this.rsuHealthStatusDepositor = rsuHealthStatusDepositor;
    }
    
    @Override
    public void onMessage(Message message) {
        byte[] payload = message.payload();
        TRUHealthStatusMessage truHealthStatusMessage = serializer.decode(payload, TRUHealthStatusMessage.class);
        System.out.println("Handling RSU Health Status Message: " + truHealthStatusMessage);
        rsuHealthStatusDepositor.depositRSUHealthStatus(truHealthStatusMessage);
    }
    
}