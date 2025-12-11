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

    @Value("${registration.tru.autoconfig.subject:unit.*.register.rsu.autoconfig}")
    private String truAutoConfigSubject;

    public RegistrationStartupRunner(RegistrationService registrationService, TaskExecutor taskExecutor) {
        this.registrationService = registrationService;
        this.taskExecutor = taskExecutor;
    }

    @Override
    public void run(ApplicationArguments args) {
        taskExecutor.execute(() -> registrationService.subscribeAutoTruConfig(truAutoConfigSubject));
    }
}
