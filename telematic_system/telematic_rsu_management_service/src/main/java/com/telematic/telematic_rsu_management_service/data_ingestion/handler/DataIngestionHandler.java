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
package com.telematic.telematic_rsu_management_service.data_ingestion.handler;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.telematic.telematic_rsu_management_service.data_ingestion.depositor.DataIngestionDepositor;
import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.MessageHandler;

import lombok.extern.slf4j.Slf4j;

@Component
@Scope("prototype")
@Slf4j
public class DataIngestionHandler implements MessageHandler {
    private DataIngestionDepositor dataIngestionDepositor;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Value("${perf.metrics.enabled:false}")
    private boolean perfMetricsEnabled;

    public DataIngestionHandler(DataIngestionDepositor dataIngestionDepositor) {
        this.dataIngestionDepositor = dataIngestionDepositor;
    }

    @Override
    public byte[] onMessage(Message message) {
        // Capture timestamp as close to NATS receipt as possible
        long tsNatsReceived = System.currentTimeMillis();
        String json = new String(message.payload());
        log.debug("Received message: {}", json);

        if (perfMetricsEnabled) {
            json = injectNatsReceivedTimestamp(json, tsNatsReceived);
        }

        dataIngestionDepositor.depositData(json);
        return null;
    }

    /**
     * Injects {@code perf_ts_nats_received} into the message metadata and logs
     * the Transit Delay at NATS checkpoint when performance metrics are enabled.
     *
     * <p>
     * Transit Delay = time between the radio unit packaging the message
     * ({@code perf_ts_ingress}) and this service receiving it from NATS.
     * </p>
     */
    private String injectNatsReceivedTimestamp(String json, long tsNatsReceived) {
        try {
            ObjectNode root = (ObjectNode) MAPPER.readTree(json);
            JsonNode metadataNode = root.get("metadata");
            if (metadataNode != null && metadataNode.isObject()) {
                ObjectNode metadata = (ObjectNode) metadataNode;
                long tsIngress = metadata.path("perf_ts_ingress").asLong(0L);
                metadata.put("perf_ts_nats_received", tsNatsReceived);

                if (tsIngress > 0L) {
                    long transitDelayMs = tsNatsReceived - tsIngress;
                    log.info(
                            "[PERF][TRANSIT_DELAY_NATS] perf_ts_ingress={} perf_ts_nats_received={} transit_delay_ms={}",
                            tsIngress, tsNatsReceived, transitDelayMs);
                } else {
                    log.info("[PERF][NATS_RECEIVED] perf_ts_nats_received={} (no ingress timestamp in message)",
                            tsNatsReceived);
                }
                return MAPPER.writeValueAsString(root);
            }
        } catch (Exception e) {
            log.warn("[PERF] Failed to inject perf_ts_nats_received: {}", e.getMessage());
        }
        return json;
    }

    public void cleanup() {
        if (dataIngestionDepositor != null) {
            dataIngestionDepositor.shutdown();
        }
    }

}
