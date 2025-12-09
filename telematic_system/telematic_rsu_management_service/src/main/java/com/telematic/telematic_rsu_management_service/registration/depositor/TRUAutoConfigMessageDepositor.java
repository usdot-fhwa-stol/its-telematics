package com.telematic.telematic_rsu_management_service.registration.depositor;

import java.util.List;

import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.model.RSUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.registration.dto.TruConfigMessage;
import com.telematic.telematic_rsu_management_service.repository.mysql.TRUConfigStatusRepository;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class TRUAutoConfigMessageDepositor {
    
    private final TRUConfigStatusRepository truConfigStatusRepository;

    public TRUAutoConfigMessageDepositor(TRUConfigStatusRepository truConfigStatusRepository) {
        this.truConfigStatusRepository = truConfigStatusRepository;
    }

    public void processAutoTruConfigMessage(TruConfigMessage configMessage) {
        TRUConfigStatus truConfigStatus = new TRUConfigStatus();
        truConfigStatus.setUnitConfig(configMessage.getUnitConfig());
        truConfigStatus.setTimestamp(configMessage.getTimestamp());
        List<RSUConfigStatus> rsuConfigStatuses = configMessage.getRsuConfigs().stream().map(rsuConfigItem -> {
            RSUConfigStatus rsuConfigStatus = new RSUConfigStatus();
            rsuConfigStatus.setEvent(rsuConfigItem.getEvent());
            rsuConfigStatus.setRsuEndpoint(rsuConfigItem.getRsuEndpoint());
            rsuConfigStatus.setStatus(null);
            rsuConfigStatus.setTimestamp(configMessage.getTimestamp());
            rsuConfigStatus.setTruConfigStatus(truConfigStatus);
            return rsuConfigStatus;
        }).toList();
        truConfigStatus.setRsuConfigs(rsuConfigStatuses);
        truConfigStatusRepository.save(truConfigStatus);
        log.info("Saved TRU Config Status with ID: {}", truConfigStatus.getId());
    }
}
