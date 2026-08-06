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
package com.telematic.telematic_rsu_management_service.data_ingestion.influx.pipeline;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Data;

@Data
public class LineRecordContext {
    private String measurement;
    private final Map<String, String> tags;
    private final Map<String, Object> fields;
    private Long timestamp;

    public LineRecordContext() {
        this.tags = new LinkedHashMap<>();
        this.fields = new LinkedHashMap<>();
    }

    public void setTags(Map<String, String> tags) {
        this.tags.clear();
        if (tags != null) {
            this.tags.putAll(tags);
        }
    }

    public void setFields(Map<String, Object> fields) {
        this.fields.clear();
        if (fields != null) {
            this.fields.putAll(fields);
        }
    }
}
