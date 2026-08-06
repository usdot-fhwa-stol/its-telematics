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
package com.telematic.telematic_rsu_management_service.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.telematic.telematic_rsu_management_service.data_ingestion.influx.pipeline.Processor;
import com.telematic.telematic_rsu_management_service.data_ingestion.influx.pipeline.processors.FieldFilter;
import com.telematic.telematic_rsu_management_service.data_ingestion.influx.pipeline.processors.FieldTypeFormatter;
import com.telematic.telematic_rsu_management_service.data_ingestion.influx.pipeline.processors.MeasurementSanitizer;
import com.telematic.telematic_rsu_management_service.data_ingestion.influx.pipeline.processors.TagSanitizer;

@Configuration
public class InfluxPipelineConfig {
    @Value("${data.ingestion.influx.remove-fields:}")
    private String removeFieldsProp;

    @Bean
    public List<Processor> processors() {
        return List.of(
            new MeasurementSanitizer(),
                new TagSanitizer(),
            new FieldTypeFormatter(),
            new FieldFilter(removeFieldsProp)
        );
    }
}
