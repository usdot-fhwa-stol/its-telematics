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

 

import org.springframework.stereotype.Component;

import com.influxdb.v3.client.InfluxDBClient;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class InfluxDBRepository {

    private InfluxDBClient client;

    public InfluxDBRepository(InfluxDBClient client) {
        this.client = client;        
    }

    public boolean writeLine(String line) {
        if (client == null) {
            log.error("InfluxDB3 client not initialized; cannot write line");
            return false;
        }
        try {
            client.writeRecord(line);
            return true;
        } catch (Exception e) {
            log.error("Error writing line to InfluxDB3: {}", e.getMessage(), e);
            return false;
        }
    }
}
