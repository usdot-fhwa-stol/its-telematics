
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

    @Value("${monitor.unit-health.subject:unit.*.monitor.config.status}")
    private String unitPluginStatusSubject;

    @Value("${monitor.rsu-health.subject:unit.*.monitor.rsu.health_status}")
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