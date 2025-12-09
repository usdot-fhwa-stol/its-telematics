package com.telematic.telematic_rsu_management_service.data_selection.service;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.data_selection.depositor.DataSelectionDepositor;
import com.telematic.telematic_rsu_management_service.data_selection.dto.RSUTopicsMessage;
import com.telematic.telematic_rsu_management_service.data_selection.dto.TRUTopicsMessage;
import com.telematic.telematic_rsu_management_service.data_selection.dto.TopicMessage;
import com.telematic.telematic_rsu_management_service.messaging.Message;
import com.telematic.telematic_rsu_management_service.messaging.Serializer;
import com.telematic.telematic_rsu_management_service.messaging.nats.NatsMessagingClient;
import com.telematic.telematic_rsu_management_service.model.DataSelectionRuleConfig;
import com.telematic.telematic_rsu_management_service.model.RSUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.RSUEndpoint;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.repository.TRUConfigStatusRepository;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class DataSelectionService {

    private NatsMessagingClient natsMessagingClient;
    private Serializer serializer;
    private DataSelectionDepositor dataSelectionDepositor;
    private TRUConfigStatusRepository truConfigStatusRepository;

    @Value("${data-selection.available-topics.subject:unit.*.data.selection.available.topics}")
    public String availableTopicSubject;

    @Value("${data-selection.available-topics.request-timeout-seconds:10}")
    public int requestTimeoutSeconds;
    
    @Value("${data-selection.confirm-topics.subject:unit.*.data.selection.confirm.topics}")
    public String confirmTopicSubject;
    
    @Value("${data-selection.confirm-topics.request-timeout-seconds:10}")
    public int confirmTopicRequestTimeoutSeconds;

    public DataSelectionService(NatsMessagingClient natsMessagingClient, Serializer serializer, DataSelectionDepositor dataSelectionDepositor, TRUConfigStatusRepository truConfigStatusRepository) {
        this.natsMessagingClient = natsMessagingClient;
        this.serializer = serializer;
        this.dataSelectionDepositor = dataSelectionDepositor;
        this.truConfigStatusRepository = truConfigStatusRepository;
    }
    
    public TRUTopicsMessage requestAvailableTopics(TRUTopicsMessage truTopicsMessage) {
        availableTopicSubject = availableTopicSubject.replace("*", truTopicsMessage.getUnitId());
        log.info("Requesting available topics for TRU ID '{}' by to subject: {}", truTopicsMessage.getUnitId(), availableTopicSubject);
        Message message = natsMessagingClient.request(availableTopicSubject, serializer.encode(truTopicsMessage),
                Duration.ofSeconds(requestTimeoutSeconds));
        TRUTopicsMessage responseTopicMessage = serializer.decode(message.payload(), TRUTopicsMessage.class);
        log.info("Received available topics response: {}", responseTopicMessage);
        TRUConfigStatus truConfigStatus = truConfigStatusRepository.findByUnitId(truTopicsMessage.getUnitId());
        Map<RSUEndpoint, List<String>> endpointToRules = truConfigStatus.getRsuConfigs().stream()
            .collect(Collectors.toMap(
                RSUConfigStatus::getRsuEndpoint,
                rsu -> rsu.getDataSelectionRuleConfigs().stream()
                        .map(DataSelectionRuleConfig::getRule)
                        .collect(Collectors.toList()),
                (a, b) -> {
                    a.addAll(b);
                    return a;
                }
                ));
        log.debug("Mark available topics based on existing rules : {}", endpointToRules);
        for(RSUTopicsMessage rsuTopicsMessage : responseTopicMessage.getRsuTopics()) {
            List<String> existingRules = endpointToRules.get(rsuTopicsMessage.getRsuEndpoint());
            for (TopicMessage topicMessage : rsuTopicsMessage.getTopics()) {
                if (existingRules != null && existingRules.contains(topicMessage.getName())) {
                    topicMessage.setSelected(true);
                } else {
                    topicMessage.setSelected(false);
                }
            }               
        }
        return responseTopicMessage;
    }

    public TRUTopicsMessage requestDataSelection(TRUTopicsMessage truTopicsMessage) {
        confirmTopicSubject = confirmTopicSubject.replace("*", truTopicsMessage.getUnitId());
        log.info("Requesting topic confirmation for TRU ID '{}' to subject: {}", truTopicsMessage.getUnitId(), confirmTopicSubject);
        Message message = natsMessagingClient.request(confirmTopicSubject, serializer.encode(truTopicsMessage),
                Duration.ofSeconds(confirmTopicRequestTimeoutSeconds));
        dataSelectionDepositor.processDataSelection(truTopicsMessage);
        TRUTopicsMessage truTopicsMessageRResponse = serializer.decode(message.payload(), TRUTopicsMessage.class);
        return truTopicsMessageRResponse;
    }
}
