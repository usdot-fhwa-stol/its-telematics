package com.telematic.telematic_rsu_management_service.health.depositor;

import org.springframework.stereotype.Component;
import com.telematic.telematic_rsu_management_service.health.dto.TRUHealthStatusMessage;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.registration.repository.TRUConfigStatusRepository;

@Component
public class RSUHealthStatusDepositor {
    private final TRUConfigStatusRepository truConfigStatusRepository;

    public RSUHealthStatusDepositor(TRUConfigStatusRepository truConfigStatusRepository) {
        this.truConfigStatusRepository = truConfigStatusRepository;
    }

    public void depositRSUHealthStatus(TRUHealthStatusMessage truHealthStatusMessage) {
        TRUConfigStatus truConfigStatus = truConfigStatusRepository
                .findByUnitId(truHealthStatusMessage.getUnitHealthStatus().getUnitId());
        if (truConfigStatus != null) {
            truConfigStatus.getPluginConfigStatus()
                    .setBridgePluginStatus(truHealthStatusMessage.getUnitHealthStatus().getBridgePluginStatus());
            truConfigStatus.getPluginConfigStatus()
                    .setHealthMonitorPluginStatus(truHealthStatusMessage.getUnitHealthStatus().getHealthMonitorPluginStatus());
            truConfigStatusRepository.save(truConfigStatus);
        } else {
            throw new IllegalArgumentException("TRUConfigStatus not found for Unit ID: "
                    + truHealthStatusMessage.getUnitHealthStatus().getUnitId());
        }
    }
}
