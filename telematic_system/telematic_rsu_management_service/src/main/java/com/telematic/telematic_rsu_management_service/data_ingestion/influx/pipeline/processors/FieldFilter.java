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
package com.telematic.telematic_rsu_management_service.data_ingestion.influx.pipeline.processors;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.telematic.telematic_rsu_management_service.data_ingestion.influx.pipeline.LineRecordContext;
import com.telematic.telematic_rsu_management_service.data_ingestion.influx.pipeline.Processor;

public class FieldFilter implements Processor {
    private final String removeFieldsProp;
    public FieldFilter(String removeFieldsProp) {
        this.removeFieldsProp = removeFieldsProp;
    }

    @Override
    public void process(LineRecordContext ctx) {
        if (removeFieldsProp != null && !removeFieldsProp.isBlank()) {
            removeFields(ctx.getFields(), Arrays.asList(removeFieldsProp.split(",")));
        }
    }
    /**
     * Remove fields from the flattened payload map based on provided keys or prefixes.
     * Keys are matched exactly; if a key in {@code removeKeys} ends with '*' it will be treated
     * as a prefix pattern and any field starting with that prefix will be removed.
     * Example removeKeys: ["payload.coreData.lat", "payload.J2735 Message.value.coreData.*"].
     */
    private void removeFields(Map<String, Object> fields, Collection<String> removeKeys) {
        if (fields == null || fields.isEmpty() || removeKeys == null || removeKeys.isEmpty()) return;
        Set<String> exact = new HashSet<>();
        List<String> prefixes = new ArrayList<>();
        for (String k : removeKeys) {
            if (k == null || k.isBlank()) continue;
            if (k.endsWith("*")) {
                prefixes.add(k.substring(0, k.length() - 1));
            } else {
                exact.add(k);
            }
        }
        List<String> toRemove = new ArrayList<>();
        for (String key : fields.keySet()) {
            if (exact.contains(key)) {
                toRemove.add(key);
                continue;
            }
            for (String p : prefixes) {
                if (!p.isEmpty() && key.startsWith(p)) {
                    toRemove.add(key);
                    break;
                }
            }
        }
        toRemove.forEach(fields::remove);
    }
}
