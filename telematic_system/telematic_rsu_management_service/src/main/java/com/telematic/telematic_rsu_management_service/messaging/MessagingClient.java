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
package com.telematic.telematic_rsu_management_service.messaging;

import java.time.Duration;
import java.util.Map;

public interface MessagingClient {
    void publish(String subject, byte[] payload, Map<String, String> headers);
    Message request(String subject, byte[] payload, Duration timeout);
    Subscription subscribe(String subject, MessageHandler handler);
    void reply(String subject, MessageHandler handler);
}
