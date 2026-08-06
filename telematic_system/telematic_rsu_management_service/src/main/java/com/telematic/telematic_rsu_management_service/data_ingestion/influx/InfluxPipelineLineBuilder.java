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

import java.util.List;
import java.util.Map;
import java.util.StringJoiner;

import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.data_ingestion.influx.pipeline.LineRecordContext;
import com.telematic.telematic_rsu_management_service.data_ingestion.influx.pipeline.Processor;

@Component
public class InfluxPipelineLineBuilder {
    private final List<Processor> processors;

    public InfluxPipelineLineBuilder(List<Processor> processors) {
        this.processors = processors;
    }

    public String build(LineRecordContext ctx) {
        for (Processor p : processors) {
            p.process(ctx);
        }
        return buildLineRecord(ctx);
    }

    private String buildLineRecord(LineRecordContext ctx) {
        String measurement = ctx.getMeasurement();
        if (measurement == null || measurement.isEmpty()) {
            throw new IllegalArgumentException("measurement required");
        }
        StringBuilder sb = new StringBuilder();
        sb.append(measurement);

        for (Map.Entry<String, String> e : ctx.getTags().entrySet()) {
            sb.append(',').append(e.getValue());
        }

        StringJoiner fieldsJoiner = new StringJoiner(",");
        for (Map.Entry<String, Object> e : ctx.getFields().entrySet()) {
            fieldsJoiner.add(e.getKey() + '=' + e.getValue());
        }
        sb.append(' ').append(fieldsJoiner.toString());

        if (ctx.getTimestamp() != null) {
            sb.append(' ').append(ctx.getTimestamp());
        }
        return sb.toString();
    }
}
