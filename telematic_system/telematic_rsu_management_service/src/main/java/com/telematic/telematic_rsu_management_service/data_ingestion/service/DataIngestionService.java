/*
 * Copyright (C) 2025 LEIDOS.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
package com.telematic.telematic_rsu_management_service.data_ingestion.service;

import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.data_ingestion.handler.DataIngestionHandler;
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