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

import java.util.Map;

import com.telematic.telematic_rsu_management_service.data_ingestion.influx.pipeline.LineRecordContext;
import com.telematic.telematic_rsu_management_service.data_ingestion.influx.pipeline.Processor;
public class FieldTypeFormatter implements Processor {
    @Override
    public void process(LineRecordContext ctx) {

        Map<String, Object> fields = ctx.getFields();
        fields.values().removeIf(v -> v == null);
        fields.replaceAll((k, v) -> format(v));
    }

     private Object format(Object v) {
        if (v instanceof Integer || v instanceof Long) {
            return ((Number) v).longValue() + "i";
        }
        if (v instanceof Float || v instanceof Double) {
            return ((Number) v).doubleValue();
        }
        if (v instanceof Boolean) {
            return ((Boolean) v) ? "true" : "false";
        }

        if (v instanceof String) {
            String s = ((String) v).trim();

            // Try integer format (no decimal point, no exponent)
            if (s.matches("-?\\d+")) {
                try {
                    long val = Long.parseLong(s);
                    return val + "i";
                } catch (NumberFormatException e) {
                    try {
                        double dval = Double.parseDouble(s);
                        return dval;
                    } catch (Exception ignore) {}
                }
            }

            // Try float or scientific notation (includes 1.23E4)
            if (s.matches("-?(\\d+\\.\\d+|\\d+\\.|\\.\\d+)([eE]-?\\d+)?")
                || s.matches("-?\\d+[eE]-?\\d+")) {
                try {
                    return Double.parseDouble(s);
                } catch (NumberFormatException ignore) {}
            }
        }
        String s = String.valueOf(v);
        s = s.replace("\\", "\\\\");
        s = s.replace("\"", "\\\"");

        return '"' + s + '"';
    }
}
