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
package com.telematic.telematic_rsu_management_service.messaging.nats;


import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.MessageHandler;
import com.telematic.telematic_rsu_management_service.messaging.Replyer;

import io.nats.client.Connection;
import io.nats.client.Dispatcher;

@Component
@ConditionalOnProperty(prefix = "messaging.nats", name = "enabled", havingValue = "true", matchIfMissing = false)
public class NatsReplyer implements Replyer {
    private final Connection connection;
    
    public NatsReplyer(Connection connection) {
        this.connection = connection;
    }

    @Override
    public void reply(String subject, MessageHandler handler) {
        if (connection == null) {
            return;
        }
        Dispatcher dispatcher = connection.createDispatcher(msg -> {
            String fromSubject = msg.getSubject();
            String replyTo = msg.getReplyTo();
            byte[] payload = msg.getData();
            byte[] responsePayload = handler.onMessage(new Message(fromSubject, payload, null));
            if (replyTo != null && !replyTo.isEmpty()) {
                connection.publish(replyTo, responsePayload);
            }
        });
        dispatcher.subscribe(subject);
    }
    
}
