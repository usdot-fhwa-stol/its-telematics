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

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.data_ingestion.influx.InfluxLineBuilder;
import com.telematic.telematic_rsu_management_service.repository.influx.InfluxDBRepository;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
@Scope("prototype") 
public class DataIngestionDepositor {
    private final InfluxDBRepository influxDBRepository;
    private final InfluxLineBuilder influxLineBuilder;

    @Value("${rsu_influx.write.batch-size:1000}")
    private int batchSize;

    @Value("${rsu_influx.write.flush-interval-ms:10}")
    private long flushIntervalMs;

    @Value("${rsu_influx.write.queue-capacity:50000}")
    private int queueCapacity;

    private LinkedBlockingQueue<String> queue;
    private volatile boolean running = false;
    private Thread writerThread;
    private String instanceId;

    public DataIngestionDepositor(InfluxDBRepository influxDBRepository, InfluxLineBuilder influxLineBuilder) {
        this.influxDBRepository = influxDBRepository;
        this.influxLineBuilder = influxLineBuilder;
        this.instanceId = UUID.randomUUID().toString().substring(0, 8);
    }

    @PostConstruct
    public void init() {
        queue = new LinkedBlockingQueue<>(queueCapacity);
        running = true;
        writerThread = new Thread(this::writerLoop, "influx-batch-writer-" + instanceId);
        writerThread.setDaemon(true);
        writerThread.start();
        log.info("Started InfluxDB batch writer [{}]: batch={}, flush={}ms, queue={}", 
                 instanceId, batchSize, flushIntervalMs, queueCapacity);
    }

    @PreDestroy
    public void destroy() {
        shutdown();
    }

    public void shutdown() {
        log.info("[{}] Shutting down InfluxDB writer. Queue remaining: {}", 
                 instanceId, queue != null ? queue.size() : 0);
        running = false;
        if (writerThread != null) {
            writerThread.interrupt();
            try {
                writerThread.join(5000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        log.info("[{}] InfluxDB writer stopped", instanceId);
    }

    private void writerLoop() {
        List<String> batch = new ArrayList<>(batchSize);

        while (running) {
            try {
                queue.drainTo(batch, batchSize);
                if (batch.isEmpty()) {
                    String first = queue.poll(flushIntervalMs, TimeUnit.MILLISECONDS);
                    if (first != null) {
                        batch.add(first);
                        queue.drainTo(batch, batchSize - 1);
                    }
                }                
                
                if (!batch.isEmpty()) {
                    influxDBRepository.writeBatch(batch);
                    log.info("Wrote number of {} records", batch.size());
                    batch.clear();
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.error("Batch write error: {}", e.getMessage(), e);
                batch.clear();
            }
        }

        // Flush remaining on shutdown
        if (!queue.isEmpty()) {
            List<String> remaining = new ArrayList<>();
            queue.drainTo(remaining);
            if (!remaining.isEmpty()) {
                try {
                    influxDBRepository.writeBatch(remaining);
                    log.info("Flushed {} remaining records on shutdown", remaining.size());
                } catch (Exception e) {
                    log.warn("Failed to flush remaining writes: {}", e.getMessage());
                }
            }
        }
    }

    public void depositData(String json) {
        try {
            String line = influxLineBuilder.buildLine(json);
            log.info("Built Influx line: {} (bytes: {})", line, line.getBytes().length);
            
            if (queue != null) {
                boolean enqueued = queue.offer(line);
                if (!enqueued) {
                    log.warn("Influx writer queue full; dropping write. Queue size: {}", queue.size());
                }
            } else {
                log.error("Queue not initialized");
            }
        } catch (Exception e) {
            log.error("Failed to build Influx line: {}", e.getMessage());
            throw new RuntimeException("Failed to build Influx line", e);
        }
    }
}
