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
package com.telematic.telematic_rsu_management_service.data_ingestion.bootstrap;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.data_ingestion.service.DataIngestionService;

import jakarta.annotation.PostConstruct;

@Component
public class DataIngestionStartupRunner implements ApplicationRunner {
    private final DataIngestionService dataIngestionService;
    private final TaskExecutor taskExecutor;


    public DataIngestionStartupRunner(DataIngestionService dataIngestionService,
                                      TaskExecutor taskExecutor) {
        this.dataIngestionService = dataIngestionService;
        this.taskExecutor = taskExecutor;
    }

    @Override
    public void run(org.springframework.boot.ApplicationArguments args) throws Exception {
        taskExecutor.execute(() -> dataIngestionService.enableDataInjestionSubscriptions());
    }

    @PostConstruct
    public void init() {
        dataIngestionService.initializeDataIngestionService();
    }
}
