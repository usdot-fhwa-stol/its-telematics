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

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class InfluxDbClient {
    private static final Logger log = LoggerFactory.getLogger(InfluxDbClient.class);

    @Value("${influx.url:http://localhost:8086}")
    private String url;

    @Value("${influx.org:default}")
    private String org;

    @Value("${influx.bucket:telemetry}")
    private String bucket;

    @Value("${influx.token:}")
    private String token;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    public boolean writeLine(String line) {
        try {
            String writeUrl = String.format("%s/api/v2/write?org=%s&bucket=%s&precision=ns", url, org, bucket);
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(writeUrl))
                    .header("Content-Type", "text/plain; charset=utf-8")
                    .POST(HttpRequest.BodyPublishers.ofString(line, StandardCharsets.UTF_8));
            if (token != null && !token.isBlank()) {
                builder.header("Authorization", "Token " + token);
            }
            HttpResponse<String> resp = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 200 && resp.statusCode() < 300) {
                return true;
            }
            log.warn("Influx write failed: status={}, body={}", resp.statusCode(), resp.body());
            return false;
        } catch (Exception e) {
            log.error("Error writing to InfluxDB", e);
            return false;
        }
    }
}
