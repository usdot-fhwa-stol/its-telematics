package com.telematic.telematic_rsu_management_service.registration.bootstrap;

import com.telematic.telematic_rsu_management_service.registration.service.RegistrationService;
import org.springframework.core.task.TaskExecutor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "messaging.nats", name = "enabled", havingValue = "true", matchIfMissing = false)
public class RegistrationStartupRunner implements ApplicationRunner {

    private final RegistrationService registrationService;
    private final TaskExecutor taskExecutor;

    @Value("${registration.tru-autoconfig.subject:unit.*.rsu.autoconfig}")
    private String truAutoConfigSubject;

    public RegistrationStartupRunner(RegistrationService registrationService, TaskExecutor taskExecutor) {
        this.registrationService = registrationService;
        this.taskExecutor = taskExecutor;
    }

    @Override
    public void run(ApplicationArguments args) {
        taskExecutor.execute(() -> registrationService.subscribeTruConfig(truAutoConfigSubject));
    }
}
