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

import com.telematic.telematic_rsu_management_service.messaging.Publisher;
import io.nats.client.Connection;
import io.nats.client.impl.Headers;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@Component
@ConditionalOnProperty(prefix = "messaging.nats", name = "enabled", havingValue = "true", matchIfMissing = false)
public class NatsPublisher implements Publisher {

    private final Connection connection;

    public NatsPublisher(Connection connection) {
        this.connection = connection;
    }

    @Override
    public void publish(String subject, byte[] payload, Map<String, String> headers) {
        if (connection == null) {
            return; // no-op if not wired yet
        }
        Headers h = null;
        if (headers != null && !headers.isEmpty()) {
            h = new Headers();
            headers.forEach(h::add);
        }
        connection.publish(subject, h, payload);
    }
}
