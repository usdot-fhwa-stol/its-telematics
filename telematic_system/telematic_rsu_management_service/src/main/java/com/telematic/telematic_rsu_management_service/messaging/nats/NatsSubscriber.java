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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.MessageHandler;
import com.telematic.telematic_rsu_management_service.messaging.Subscriber;

import io.nats.client.Connection;
import io.nats.client.Dispatcher;
import io.nats.client.impl.Headers;
import lombok.extern.slf4j.Slf4j;

@Component
@Primary
@Slf4j
@ConditionalOnProperty(prefix = "messaging.nats", name = "enabled", havingValue = "true", matchIfMissing = false)
public class NatsSubscriber implements Subscriber {

    private final Connection connection;
    private final Set<String> subscribedSubjects = ConcurrentHashMap.newKeySet();
    private final Map<String, ExecutorService> perSubjectExecutors = new ConcurrentHashMap<>();
    private final Map<String, Set<Dispatcher>> subjectDispatchers = new ConcurrentHashMap<>();

    public NatsSubscriber(Connection connection) {
        this.connection = connection;
    }

    @Override
    public NatsSubscription subscribe(String subject, MessageHandler handler) {
         if (connection == null) {
            return new NatsSubscription();
        }
        ExecutorService subjectExecutor = perSubjectExecutors.computeIfAbsent(subject, s ->
            Executors.newSingleThreadExecutor(r -> {
                Thread t = new Thread(r);
                t.setName(s);
                t.setDaemon(true);
                return t;
            })
        );

        Dispatcher d = connection.createDispatcher(msg -> {
            log.debug("Received NATS message on subject: {}", msg.getSubject());
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
            subjectExecutor.execute(() -> handler.onMessage(m));
        });
        d.subscribe(subject);
        subscribedSubjects.add(subject);
        subjectDispatchers.computeIfAbsent(subject, s -> ConcurrentHashMap.newKeySet()).add(d);
        return new NatsSubscription();
    }

    public NatsSubscription subscribeQueueWorker(String subject, String queue, MessageHandler handler, int workerId) {
        if (connection == null) {
            return new NatsSubscription();
        }
        ExecutorService subjectExecutor = perSubjectExecutors.computeIfAbsent(subject+"-" + queue + "-" + workerId, s ->
        Executors.newSingleThreadExecutor(r -> {
                Thread t = new Thread(r);
                t.setName(s);
                t.setDaemon(true);
                return t;
            })
        );
        Dispatcher d = connection.createDispatcher(msg -> {
            log.debug("Received NATS message on subject: {}", msg.getSubject());           
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
            subjectExecutor.execute(() -> handler.onMessage(m));
        });
        d.subscribe(subject, queue);
        subscribedSubjects.add(subject);
        subjectDispatchers.computeIfAbsent(subject, s -> ConcurrentHashMap.newKeySet()).add(d);
        return new NatsSubscription();
    }

    public NatsSubscription subscribeQueue(String subject, String queue, MessageHandler handler, int workers) {
        NatsSubscription last = new NatsSubscription();
        for (int i = 0; i < Math.max(1, workers); i++) {
            last = subscribeQueueWorker(subject, queue, handler, i);
            log.debug("Created 'worker-{}' for subject '{}' with queue '{}'", i, subject, queue);
        }
        return last;
    }

    public Set<Dispatcher> getDispatchersForSubject(String subject) {
        return subjectDispatchers.getOrDefault(subject, Set.of());
    }

    public void unsubscribeSubject(String subject) {
        Set<Dispatcher> dispatchers = subjectDispatchers.remove(subject);
        if (dispatchers != null) {
            for (Dispatcher d : dispatchers) {
                try {
                    d.unsubscribe(subject);
                } catch (Exception e) {
                    log.warn("Failed to unsubscribe dispatcher for subject {}: {}", subject, e.getMessage());
                }
            }
        }
        subscribedSubjects.remove(subject);
        // Shutdown executors created for this subject (including queue/worker variants)
        perSubjectExecutors.entrySet().removeIf(entry -> {
            String key = entry.getKey();
            if (key.startsWith(subject)) {
                try {
                    entry.getValue().shutdownNow();
                } catch (Exception ignored) {}
                return true;
            }
            return false;
        });
        log.debug("Unsubscribed all dispatchers and executors for subject '{}'", subject);
    }
}
