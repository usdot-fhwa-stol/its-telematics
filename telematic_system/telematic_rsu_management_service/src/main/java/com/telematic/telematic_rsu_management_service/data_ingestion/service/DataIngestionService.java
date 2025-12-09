package com.telematic.telematic_rsu_management_service.data_ingestion.service;

import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.data_ingestion.DataIngestionHandler;
import com.telematic.telematic_rsu_management_service.messaging.nats.NatsMessagingClient;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class DataIngestionService {
    private NatsMessagingClient natsMessagingClient;
    private DataIngestionHandler dataIngestionHandler;

    public DataIngestionService(NatsMessagingClient natsMessagingClient, DataIngestionHandler dataIngestionHandler) {
        this.natsMessagingClient = natsMessagingClient;
        this.dataIngestionHandler = dataIngestionHandler;
    }

    public void ingestData(String subject) {
        log.info("Subscribing to data ingestion on subject: {}", subject);
        natsMessagingClient.subscribe(subject, dataIngestionHandler);
    }
    
}