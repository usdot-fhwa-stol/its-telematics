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
package com.telematic.telematic_rsu_management_service.registration.handler;

import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.MessageHandler;
import com.telematic.telematic_rsu_management_service.messaging.Serializer;
import com.telematic.telematic_rsu_management_service.registration.depositor.TRUAutoConfigMessageDepositor;
import com.telematic.telematic_rsu_management_service.registration.dto.TruConfigMessage;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class TRUAutoConfigMessageHandler implements MessageHandler {
    private final Serializer serializer;
    private final TRUAutoConfigMessageDepositor truAutoConfigMessageDepositor;

    public TRUAutoConfigMessageHandler(Serializer serializer, TRUAutoConfigMessageDepositor truAutoConfigMessageDepositor) {
        this.serializer = serializer;
        this.truAutoConfigMessageDepositor = truAutoConfigMessageDepositor;
    }
    
    @Override
    public void onMessage(Message message) {
        byte[] payload = message.payload();
        TruConfigMessage configMessage = serializer.decode(payload, TruConfigMessage.class);
        log.info("Automatic TRU Config Message received: {}", configMessage);
        truAutoConfigMessageDepositor.processAutoTruConfigMessage(configMessage);
    }    
}
