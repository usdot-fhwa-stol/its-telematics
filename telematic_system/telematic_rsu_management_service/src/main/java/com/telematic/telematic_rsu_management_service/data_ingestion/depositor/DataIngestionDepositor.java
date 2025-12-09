package com.telematic.telematic_rsu_management_service.data_ingestion.depositor;

import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.messaging.Message;

@Component
public class DataIngestionDepositor {
    public void depositData(Message message) {
        // Implement the logic to deposit or store the ingested data
        System.out.println("Depositing data: " + message.payload());        
    }
}
