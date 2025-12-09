package com.telematic.telematic_rsu_management_service.data_selection.depositor;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.data_selection.dto.RSUTopicsMessage;
import com.telematic.telematic_rsu_management_service.data_selection.dto.TRUTopicsMessage;
import com.telematic.telematic_rsu_management_service.model.DataSelectionRuleConfig;
import com.telematic.telematic_rsu_management_service.model.RSUEndpoint;
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

    public void processDataSelection(TRUTopicsMessage truTopicMessage) {
        TRUConfigStatus truConfigStatus = truConfigStatusRepository.findByUnitId(truTopicMessage.getUnitId());
        List<RSUConfigStatus> rsuConfigs = truConfigStatus.getRsuConfigs();
        Map<RSUEndpoint, List<String>> topicsByEndpoint = truTopicMessage.getRsuTopics().stream()
            .collect(Collectors.toMap(
                RSUTopicsMessage::getRsuEndpoint,
                msg -> msg.getTopics().stream().map(topic -> topic.getName()).collect(Collectors.toList()),
                (a, b) -> { 
                    List<String> merged = new ArrayList<>(a);
                    merged.addAll(b);
                    return merged;
                }
            ));
        for (RSUConfigStatus rsuConfig : rsuConfigs) {
            List<String> topics = topicsByEndpoint.get(rsuConfig.getRsuEndpoint());
            if (topics == null || topics.isEmpty()) {
                continue;
            }
            
            // Replace existing rules with new ones
            Iterator<DataSelectionRuleConfig> iter = rsuConfig.getDataSelectionRuleConfigs().iterator();
            while (iter.hasNext()) {
                var existing = iter.next();
                existing.setRsuConfigStatus(null);
                iter.remove();
            }

            for (String topic : topics) {
                DataSelectionRuleConfig ruleConfig = new DataSelectionRuleConfig();
                ruleConfig.setRule(topic);
                ruleConfig.setRsuConfigStatus(rsuConfig);
                rsuConfig.getDataSelectionRuleConfigs().add(ruleConfig);
            }
        }
        truConfigStatusRepository.save(truConfigStatus);
    }
}
