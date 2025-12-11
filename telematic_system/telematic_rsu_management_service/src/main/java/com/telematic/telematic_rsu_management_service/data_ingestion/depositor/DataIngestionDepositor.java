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
package com.telematic.telematic_rsu_management_service.data_ingestion.depositor;

import java.time.Instant;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.data_ingestion.influx.InfluxLineBuilder;
import com.telematic.telematic_rsu_management_service.repository.influx.InfluxDbClient;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class DataIngestionDepositor {
    private final InfluxDbClient influxDbClient;
    private final InfluxLineBuilder influxLineBuilder;
    private static final Logger CSV = LogManager.getLogger("csv");

    public DataIngestionDepositor(InfluxDbClient influxDbClient, InfluxLineBuilder influxLineBuilder) {
        this.influxDbClient = influxDbClient;
        this.influxLineBuilder = influxLineBuilder;
    }

    public void depositData(String json) {
        try {
            long startTimeMs = Instant.now().toEpochMilli();
            long buildLineStartTimeMs = Instant.now().toEpochMilli();
            String line = influxLineBuilder.buildLine(json);
            long buildLineEndTimeMs = Instant.now().toEpochMilli();
            long buildLineLatencyMs = (buildLineEndTimeMs - buildLineStartTimeMs);
            log.info("Built Influx line: {}", line);
            long saveStartTimeMs = Instant.now().toEpochMilli();
            // boolean ok = influxDbClient.writeLine(line);
            // if (!ok) {
            //     log.error("Influx write failed.");
            // }
            long saveEndTimeMs = Instant.now().toEpochMilli();
            long depositLatencyMs = (saveEndTimeMs - saveStartTimeMs);
            long endTimeMs = Instant.now().toEpochMilli();
            long overallLatencyMs = (endTimeMs - startTimeMs);
            String threadName = Thread.currentThread().getName();
            CSV.info("{}", String.format("%d,%d,%d,%d,%s", buildLineLatencyMs, depositLatencyMs, overallLatencyMs, endTimeMs, threadName));
        } catch (Exception e) {
            log.error("Failed to build Influx line: {}", e.getMessage());
            throw new RuntimeException("Failed to build Influx line", e);
        }
    }
}
