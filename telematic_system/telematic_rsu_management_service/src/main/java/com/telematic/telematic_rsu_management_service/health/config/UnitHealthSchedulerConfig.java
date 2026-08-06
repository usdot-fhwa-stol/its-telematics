/*
 * Copyright (C) 2026 LEIDOS.
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
package com.telematic.telematic_rsu_management_service.health.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import lombok.Data;

@Configuration
@ConfigurationProperties(prefix = "monitor.unit.health.check")
@Data
public class UnitHealthSchedulerConfig {
    
    /**
     * Whether the unit health check scheduler is enabled
     */
    private boolean enabled = true;
    
    /**
     * Maximum number of missed heartbeats before considering a unit unhealthy
     * Unit is removed if: currentTime > lastPingTimestamp + (maxMissedHeartbeats * pluginHeartbeatInterval)
     */
    private int maxMissedHeartbeats = 5; // Default 5 times
}
