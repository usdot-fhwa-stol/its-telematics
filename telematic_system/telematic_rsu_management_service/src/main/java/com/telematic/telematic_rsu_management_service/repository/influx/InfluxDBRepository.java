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
package com.telematic.telematic_rsu_management_service.repository.influx;

 

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import com.influxdb.v3.client.InfluxDBClient;
import com.influxdb.v3.client.write.WriteOptions;
import com.influxdb.v3.client.write.WritePrecision;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class InfluxDBRepository {

    private InfluxDBClient client;
    private WebClient influxWebClient;

    @Value("${rsu_influx.endpoints.configure-database:/api/v3/configure/database?format=json}")
    private String configureDatabaseEndpoint;

    @Value("${rsu_influx.database:rsu_data}")
    private String database;

    @Value("${rsu_influx.token:}")
    private String token;

    public InfluxDBRepository(InfluxDBClient client, @Qualifier("influxWebClient") WebClient influxWebClient) {
        this.client = client;
        this.influxWebClient = influxWebClient;
    }

    public void writeBatch(List<String> lines) {
        try {
                if (lines.isEmpty()) {
                    return;
                }
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < lines.size(); i++) {
                    sb.append(lines.get(i));
                    if (i < lines.size() - 1) {
                        sb.append('\n');
                    }
                }
                WriteOptions options = new WriteOptions.Builder().precision(WritePrecision.MS).build();
                client.writeRecord(sb.toString(), options);
            } catch (Exception e) {
                throw new RuntimeException(String.format("Error writing batch to InfluxDB3: %s", e.getMessage()), e);
            }
    }
    
    public boolean createDatabaseIfNotExists(String databaseName, String adminToken) {
        try {
            if (!databaseExists(databaseName, adminToken)) {
                log.info("Creating InfluxDB3 database: {}", databaseName);
                influxWebClient.post()
                        .uri(configureDatabaseEndpoint)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .bodyValue(Map.of("db", databaseName))
                        .retrieve()
                        .bodyToMono(Void.class)
                        .block();
                return true;
            } else {
                log.info("InfluxDB3 database {} already exists", databaseName);
                return true;
            }
        } catch (Exception e) {
            throw new RuntimeException(
                    String.format("Error creating InfluxDB3 database %s: %s", databaseName, e.getMessage()), e);
        }
    }
    
    public boolean databaseExists(String databaseName, String adminToken) {
        try {
            List<Map<String, Object>> databases = influxWebClient.get()
                    .uri(configureDatabaseEndpoint)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {})
                    .block();
            if (databases == null) return false;
            for (Map<String, Object> db : databases) {
                Object nameObj = db.get("name");
                if (nameObj == null) nameObj = db.get("iox::database");
                if (nameObj instanceof String && databaseName.equals(nameObj)) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            throw new RuntimeException(
                    String.format("Error checking existence of InfluxDB3 database %s: %s", databaseName, e.getMessage()), e);
        }
    }
}
