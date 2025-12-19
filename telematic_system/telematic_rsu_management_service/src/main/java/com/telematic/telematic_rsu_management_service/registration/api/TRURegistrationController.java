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
package com.telematic.telematic_rsu_management_service.registration.api;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.Serializer;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.registration.dto.TruConfigMessage;
import com.telematic.telematic_rsu_management_service.registration.service.RegistrationService;

@RestController
@RequestMapping("/api/registration")
public class TRURegistrationController {
    private final RegistrationService registrationService;

    @Value("${registration.tru.config.subject:unit.*.register.rsu.config}")
    private String truConfigSubject;
    @Value("${registration.tru.config.request.timeout:5}")
    private long requestTimeout;

    public TRURegistrationController(RegistrationService registrationService, Serializer serializer) {
        this.registrationService = registrationService;
    }
    
    @GetMapping(path = "/all-tru-registration-status")
    public ResponseEntity<?> getTruRegistrationStatus() {
        List<TRUConfigStatus> truConfigMessages = registrationService.getAllTruConfigs();
        return ResponseEntity.ok().body(truConfigMessages);
    }

    @PostMapping(path = "/update-tru-config")
    public ResponseEntity<?> updateTruConfig(@RequestBody TruConfigMessage rsuConfigItemMessage) {
        Message message = registrationService.requestTruConfig(truConfigSubject, rsuConfigItemMessage,
                requestTimeout);
        return ResponseEntity.ok().body(message);
    }
}
