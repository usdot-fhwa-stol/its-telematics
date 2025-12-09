package com.telematic.telematic_rsu_management_service.health.depositor;

import org.springframework.stereotype.Component;
import com.telematic.telematic_rsu_management_service.health.dto.RSUHealthStatusMessage;
import com.telematic.telematic_rsu_management_service.health.dto.TRUHealthStatusMessage;
import com.telematic.telematic_rsu_management_service.model.RSUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.repository.mysql.TRUConfigStatusRepository;

@Component
public class UnitStatusDepositor {
     private final TRUConfigStatusRepository truConfigStatusRepository;

    public UnitStatusDepositor(TRUConfigStatusRepository truConfigStatusRepository) {
        this.truConfigStatusRepository = truConfigStatusRepository;
    }

    public void depositUnitStatus(TRUHealthStatusMessage truHealthStatusMessage) {
         TRUConfigStatus truConfigStatus = truConfigStatusRepository
                .findByUnitId(truHealthStatusMessage.getUnitHealthStatus().getUnitId());
        if (truConfigStatus != null) {
            for (RSUConfigStatus rsuConfigStatus : truConfigStatus.getRsuConfigs()) {
                for(RSUHealthStatusMessage rsuHealthStatusMessage : truHealthStatusMessage.getRsuHealthStatus()) {
                    if (rsuConfigStatus.getRsuEndpoint().getIp().equals(rsuHealthStatusMessage.getIp())
                            && rsuConfigStatus.getRsuEndpoint().getPort().equals(rsuHealthStatusMessage.getPort())) {
                        rsuConfigStatus.setStatus(rsuHealthStatusMessage.getStatus());
                        rsuConfigStatus.setEvent(rsuHealthStatusMessage.getEvent());
                    }
                }
            }
            truConfigStatusRepository.save(truConfigStatus);
        } else {
            throw new IllegalArgumentException("TRUConfigStatus not found for unitId: " + truHealthStatusMessage.getUnitHealthStatus().getUnitId());
        }
    }
}
