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

import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.MessageHandler;
import com.telematic.telematic_rsu_management_service.messaging.Subscriber;
import io.nats.client.Connection;
import io.nats.client.Dispatcher;
import io.nats.client.impl.Headers;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.core.task.TaskExecutor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import jakarta.annotation.PreDestroy;

@Component
@ConditionalOnProperty(prefix = "messaging.nats", name = "enabled", havingValue = "true", matchIfMissing = false)
public class NatsSubscriber implements Subscriber {

    private final Connection connection;
    private final Set<String> subscribedSubjects = ConcurrentHashMap.newKeySet();
    private final TaskExecutor taskExecutor;

    public NatsSubscriber(Connection connection, TaskExecutor taskExecutor) {
        this.connection = connection;
        this.taskExecutor = taskExecutor;
    }

    @Override
    public NatsSubscription subscribe(String subject, MessageHandler handler) {
         if (connection == null) {
            return new NatsSubscription();
        }
        Dispatcher d = connection.createDispatcher(msg -> {
            byte[] data = msg.getData();
            Map<String,String> headers = new HashMap<>();
            Headers h = msg.getHeaders();
            if (h != null) {
                h.keySet().forEach(k -> {
                    List<String> values = h.get(k);
                    headers.put(k, values == null ? "" : String.join(",", values));
                });
            }
            Message m = new Message(msg.getSubject(), data, headers);
            taskExecutor.execute(() -> handler.onMessage(m));
        });
        d.subscribe(subject);
        subscribedSubjects.add(subject);
        return new NatsSubscription();
    }
}
