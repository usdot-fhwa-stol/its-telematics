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
public class TagSanitizer implements Processor {
    @Override
    public void process(LineRecordContext ctx) {
        Map<String, String> tags = ctx.getTags();
        tags.replaceAll((k, v) -> sanitize(k) + "=" + sanitize(v));
    }

    private String sanitize(String s) {
        if (s == null) return "";
        return s.replace(" ", "\\ ")
                .replace(",", "\\,")
                .replace("=", "\\=");
    }
}
