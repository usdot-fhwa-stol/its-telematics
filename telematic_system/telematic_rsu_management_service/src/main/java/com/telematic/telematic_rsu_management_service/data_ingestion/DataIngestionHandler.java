package com.telematic.telematic_rsu_management_service.data_ingestion;

import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.data_ingestion.depositor.DataIngestionDepositor;
import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.MessageHandler;

@Component
public class DataIngestionHandler implements MessageHandler {
    private DataIngestionDepositor dataIngestionDepositor;

    public DataIngestionHandler(DataIngestionDepositor dataIngestionDepositor) {
        this.dataIngestionDepositor = dataIngestionDepositor;
    }

    @Override
    public void onMessage(Message message) {
        dataIngestionDepositor.depositData(message);
    }
    
}
