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
package com.telematic.telematic_rsu_management_service.data_selection.depositor;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.data_selection.dto.TRUTopicsMessage;
import com.telematic.telematic_rsu_management_service.model.DataSelectionRuleConfig;
import com.telematic.telematic_rsu_management_service.model.RSUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.repository.mysql.TRUConfigStatusRepository;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class DataSelectionDepositor {
    private final TRUConfigStatusRepository truConfigStatusRepository;
    
    public DataSelectionDepositor(TRUConfigStatusRepository truConfigStatusRepository) {
        this.truConfigStatusRepository = truConfigStatusRepository;
    }

        public boolean processDataSelection(TRUTopicsMessage truTopicMessage) {
        TRUConfigStatus truConfigStatus = truConfigStatusRepository.findByUnitId(truTopicMessage.getUnitId());

        if (truConfigStatus == null) {
            log.warn("No TRUConfigStatus found for unitId '{}'. Skipping data selection persistence.",
                    truTopicMessage.getUnitId());
            return false;
        }

        List<RSUConfigStatus> rsuConfigs = truConfigStatus.getRsuConfigs();
        if (rsuConfigs == null || rsuConfigs.isEmpty()) {
            log.warn("No RSUConfigStatus entries found for unitId '{}'. Skipping data selection persistence.",
                    truTopicMessage.getUnitId());
            return false;
        }
        Map<String, List<String>> topicsByIp = truTopicMessage.getRsuTopics().stream()
            .collect(Collectors.toMap(
                msg -> msg.getRsu().getIp(),
                msg -> msg.getTopics().stream()
                    .filter(topic -> topic.getSelected())  // Only include selected topics
                    .map(topic -> topic.getName())
                    .collect(Collectors.toList()),
                (a, b) -> { 
                    List<String> merged = new ArrayList<>(a);
                    merged.addAll(b);
                    return merged;
                }
            ));
        for (RSUConfigStatus rsuConfig : rsuConfigs) {
            // Match by IP address only
            List<String> topics = topicsByIp.get(rsuConfig.getRsu().getIp());
            
            // Skip RSUs that are not in the incoming message
            if (topics == null) {
                log.debug("RSU with IP '{}' not in incoming message, skipping", rsuConfig.getRsu().getIp());
                continue;
            }
            
            // Clear existing rules (even if empty list) to support stop broadcast
            if (rsuConfig.getDataSelectionRuleConfigs() != null) {
                Iterator<DataSelectionRuleConfig> iter = rsuConfig.getDataSelectionRuleConfigs().iterator();
                while (iter.hasNext()) {
                    var existing = iter.next();
                    existing.setRsuConfigStatus(null);
                    iter.remove();
                }
            } else {
                rsuConfig.setDataSelectionRuleConfigs(new ArrayList<>());
            }

            // Add new rules (if topics list is empty, rules remain cleared for stop broadcast)
            if (topics.isEmpty()) {
                log.info("Clearing all topics for RSU with IP '{}' - stopping broadcast", rsuConfig.getRsu().getIp());
            } else {
                log.info("Setting {} topic(s) for RSU with IP '{}'", topics.size(), rsuConfig.getRsu().getIp());
                for (String topic : topics) {
                    DataSelectionRuleConfig ruleConfig = new DataSelectionRuleConfig();
                    ruleConfig.setRule(topic);
                    ruleConfig.setRsuConfigStatus(rsuConfig);
                    rsuConfig.getDataSelectionRuleConfigs().add(ruleConfig);
                }
            }
        }
        truConfigStatusRepository.save(truConfigStatus);
        return true;
    }
}
