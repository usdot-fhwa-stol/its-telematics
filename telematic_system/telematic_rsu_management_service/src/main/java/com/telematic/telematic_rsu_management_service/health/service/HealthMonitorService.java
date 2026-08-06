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