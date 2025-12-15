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
package com.telematic.telematic_rsu_management_service.config;

import java.util.concurrent.ThreadPoolExecutor;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.reactive.function.client.WebClient;

import com.influxdb.v3.client.InfluxDBClient;

@Configuration
public class InfluxClientConfig {
    
    @Value("${rsu_influx.url:http://localhost:8181}")
    private String host;

    @Value("${rsu_influx.database:rsu_data}")
    private String database;

    @Value("${rsu_influx.token:}")
    private String token;

    @Bean
    public InfluxDBClient influxDbClient() {
        return InfluxDBClient.getInstance(host, token.toCharArray(), database);
    }

    @Bean
    @Qualifier("influxWebClient")
    public WebClient influxWebClient() {
       return WebClient.create(host);
    }
}
