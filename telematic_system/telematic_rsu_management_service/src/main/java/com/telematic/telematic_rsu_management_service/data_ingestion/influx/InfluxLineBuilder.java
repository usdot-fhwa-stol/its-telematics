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
package com.telematic.telematic_rsu_management_service.data_ingestion.influx;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.telematic.telematic_rsu_management_service.data_ingestion.influx.pipeline.LineRecordContext;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class InfluxLineBuilder {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private final InfluxPipelineLineBuilder pipelineLineBuilder;

    @Value("${perf.metrics.enabled:false}")
    private boolean perfMetricsEnabled;

    public InfluxLineBuilder(InfluxPipelineLineBuilder pipelineLineBuilder) {
        this.pipelineLineBuilder = pipelineLineBuilder;
    }

    public String buildLine(String json) throws Exception {
        LineRecordContext ctx = new LineRecordContext();
        JsonNode root = MAPPER.readTree(json);
        JsonNode metadata = root.path("metadata");
        JsonNode payload = root.path("payload");

        String event = metadata.path("event").asText("unknown");
        String measurement = event;
        ctx.setMeasurement(measurement);

        Map<String, String> tags = new LinkedHashMap<>();
        tags.put("unitId", metadata.path("unitId").asText("unknown"));
        tags.put("rsuIp", metadata.path("rsu").path("ip").asText("0.0.0.0"));
        tags.put("topicName", metadata.path("topicName").asText("unknown"));
        tags.put("port", metadata.path("rsu").path("port").asText("0"));

        if (perfMetricsEnabled) {
            // Tag checkpoint timestamps so they are queryable dimensions in InfluxDB.
            // perf_ts_ingress : epoch ms when the message was packaged at the radio unit
            // perf_ts_nats_received: epoch ms when rsu_management_service received it from
            // NATS
            long tsIngress = metadata.path("perf_ts_ingress").asLong(0L);
            long tsNatsReceived = metadata.path("perf_ts_nats_received").asLong(0L);
            if (tsIngress > 0L) {
                tags.put("perf_ts_ingress", String.valueOf(tsIngress));
            }
            if (tsNatsReceived > 0L) {
                tags.put("perf_ts_nats_received", String.valueOf(tsNatsReceived));
            }
        }

        ctx.setTags(tags);

        Map<String, Object> fields = new LinkedHashMap<>();
        flatten("payload", payload, fields);
        ctx.setFields(fields);

        if (perfMetricsEnabled) {
            // Omit explicit timestamp — InfluxDB will assign the server-side receipt time,
            // which represents the true sink time for ingress-to-sink latency calculation.
            ctx.setTimestamp(null);
        } else {
            long timestampMs = metadata.path("timestamp").asLong(0L);
            ctx.setTimestamp(timestampMs);
        }

        return pipelineLineBuilder.build(ctx);
    }

    private void flatten(String prefix, JsonNode node, Map<String, Object> out) {
        if (node == null || node.isMissingNode() || node.isNull())
            return;
        if (node.isObject()) {
            node.fields().forEachRemaining(e -> {
                String key = prefix + "." + e.getKey();
                flatten(key, e.getValue(), out);
            });
        } else if (node.isArray()) {
            int idx = 0;
            for (JsonNode item : node) {
                String key = prefix + "." + idx;
                flatten(key, item, out);
                idx++;
            }
        } else {
            out.put(prefix, node.asText("unknown"));
        }
    }
}
