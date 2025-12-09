package com.telematic.telematic_rsu_management_service.health.service;

import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.health.handler.RSUHealthStatusHandler;
import com.telematic.telematic_rsu_management_service.health.handler.UnitHealthStatusHandler;
import com.telematic.telematic_rsu_management_service.messaging.MessagingClient;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class HealthMonitorService {
    private final MessagingClient messagingClient;
    private final RSUHealthStatusHandler rsuHealthStatusHandler;
    private final UnitHealthStatusHandler unitHealthStatusHandler;

    public HealthMonitorService(RSUHealthStatusHandler rsuHealthStatusHandler,
                                UnitHealthStatusHandler unitHealthStatusHandler, MessagingClient messagingClient) {
        this.rsuHealthStatusHandler = rsuHealthStatusHandler;
        this.unitHealthStatusHandler = unitHealthStatusHandler;
        this.messagingClient = messagingClient;
    }

    public void monitorRSUHealthStatus(String rsuHealthSubject) {
         log.info("Subscribing to RSU Health Status Subject: {}", rsuHealthSubject);
         messagingClient.subscribe(rsuHealthSubject, rsuHealthStatusHandler);
    }
    
    public void monitorPluginStatus(String unitPluginStatusSubject) {
         log.info("Subscribing to Unit Plugin Status Subject: {}", unitPluginStatusSubject);
         messagingClient.subscribe(unitPluginStatusSubject, unitHealthStatusHandler);
    }
}