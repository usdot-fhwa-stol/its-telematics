package com.telematic.telematic_rsu_management_service.data_ingestion.bootstrap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.data_ingestion.service.DataIngestionService;

@Component
public class DataIngestionStartupRunner implements ApplicationRunner {
    private final DataIngestionService dataIngestionService;
    private TaskExecutor taskExecutor;
    
    
    @Value("${data-ingestion.subject: unit.*.data.ingestion.rsu.*.data}")
    private String dataIngestionSubject;

    public DataIngestionStartupRunner(DataIngestionService dataIngestionService, TaskExecutor taskExecutor) {
        this.dataIngestionService = dataIngestionService;
        this.taskExecutor = taskExecutor;
    }

    @Override
    public void run(org.springframework.boot.ApplicationArguments args) throws Exception {
        taskExecutor.execute(() -> 
            dataIngestionService.ingestData(dataIngestionSubject)
        );       
    }
}
