package com.telematic.telematic_rsu_management_service.data_ingestion.depositor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.data_ingestion.influx.InfluxLineBuilder;
import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.repository.influx.InfluxDbClient;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class DataIngestionDepositor {
    private final InfluxDbClient influxDbClient;
    private final InfluxLineBuilder influxLineBuilder;

    @Value("${data-ingestion.influx.remove-fields:}")
    private String removeFieldsProp;

    public DataIngestionDepositor(InfluxDbClient influxDbClient, InfluxLineBuilder influxLineBuilder) {
        this.influxDbClient = influxDbClient;
        this.influxLineBuilder = influxLineBuilder;
    }

    public void depositData(Message message) {
        String json = new String(message.payload());
        log.debug("Received JSON: {}", json);
        try {
            String line = influxLineBuilder.buildLine(json);
            boolean ok = influxDbClient.writeLine(line);
            if (!ok) {
                log.error("Influx write failed.");
            }
        } catch (Exception e) {
            log.error("Failed to build Influx line: {}", e.getMessage());
            throw new RuntimeException("Failed to build Influx line", e);
        }
    }
}
