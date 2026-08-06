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
package com.telematic.telematic_rsu_management_service.health.bootstrap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Component;
import com.telematic.telematic_rsu_management_service.health.service.HealthMonitorService;

@Component
@ConditionalOnProperty(prefix = "messaging.nats", name = "enabled", havingValue = "true", matchIfMissing = false)
public class HealthMonitorStartupRunner implements ApplicationRunner {
    private TaskExecutor taskExecutor;
    private HealthMonitorService healthMonitorService;

    public HealthMonitorStartupRunner(TaskExecutor taskExecutor, HealthMonitorService healthMonitorService) {
        this.taskExecutor = taskExecutor;
        this.healthMonitorService = healthMonitorService;
    }

    @Value("${monitor.plugin.health.subject:unit.*.monitor.plugin.health_status}")
    private String unitPluginStatusSubject;

    @Value("${monitor.rsu.health.subject:unit.*.monitor.rsu.health_status}")
    private String rsuHealthSubject;

    @Override
    public void run(ApplicationArguments args) {        
        taskExecutor.execute(() -> {
            healthMonitorService.monitorRSUHealthStatus(rsuHealthSubject);
        });
        taskExecutor.execute(() -> {
            healthMonitorService.monitorPluginStatus(unitPluginStatusSubject);
        });
    }
}