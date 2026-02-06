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
        ctx.setTags(tags);

        Map<String, Object> fields = new LinkedHashMap<>();
        flatten("payload", payload, fields);
        ctx.setFields(fields);

        long timestampNs = metadata.path("timestamp").asLong(0L);
        ctx.setTimestamp(timestampNs);
        
        return pipelineLineBuilder.build(ctx);
    }

    private void flatten(String prefix, JsonNode node, Map<String, Object> out) {
        if (node == null || node.isMissingNode() || node.isNull()) return;
        if (node.isObject()) {
            node.fields().forEachRemaining(e -> {
                String key = prefix + "." + e.getKey();
                flatten(key, e.getValue(), out);
            });
        } else if (node.isArray()) {
            int idx = 0;
            for (JsonNode item : node) {
                String key = prefix + "[" + idx + "]";
                flatten(key, item, out);
                idx++;
            }
        } else {
            out.put(prefix, node.asText("unknown"));
        }
    }
}
