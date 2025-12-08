package com.telematic.telematic_rsu_management_service.registration.depositor;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Component;

import com.telematic.telematic_rsu_management_service.model.RSUConfigStatus;
import com.telematic.telematic_rsu_management_service.model.TRUConfigStatus;
import com.telematic.telematic_rsu_management_service.registration.dto.RsuConfigItemMessage;
import com.telematic.telematic_rsu_management_service.registration.dto.TruConfigMessage;
import com.telematic.telematic_rsu_management_service.registration.repository.TRUConfigStatusRepository;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class TruConfigMessageDepositor {
    
    private final TRUConfigStatusRepository truConfigStatusRepository;

    public TruConfigMessageDepositor(TRUConfigStatusRepository truConfigStatusRepository) {
        this.truConfigStatusRepository = truConfigStatusRepository;
    }

    public void processAutoTruConfigMessage(TruConfigMessage configMessage) {
        TRUConfigStatus truConfigStatus = new TRUConfigStatus();
        truConfigStatus.setUnitConfig(configMessage.getUnit());
        truConfigStatus.setTimestamp(configMessage.getTimestamp());
        List<RSUConfigStatus> rsuConfigStatuses = configMessage.getRsuConfigs().stream().map(rsuConfigItem -> {
            RSUConfigStatus rsuConfigStatus = new RSUConfigStatus();
            rsuConfigStatus.setEvent(rsuConfigItem.getEvent());
            rsuConfigStatus.setRsuEndpoint(rsuConfigItem.getRsuEndpoint());
            rsuConfigStatus.setStatus(null);
            rsuConfigStatus.setDataTypes(null);
            rsuConfigStatus.setTimestamp(configMessage.getTimestamp());
            rsuConfigStatus.setTruConfigStatus(truConfigStatus);
            return rsuConfigStatus;
        }).toList();
        truConfigStatus.setRsuConfigs(rsuConfigStatuses);
        truConfigStatusRepository.save(truConfigStatus);
        log.info("Saved TRU Config Status with ID: {}", truConfigStatus.getId());
    }

    public void processTruConfigMessage(TruConfigMessage truConfigMessage) {
        TRUConfigStatus existingTruConfig = getTruConfigByUnitId(truConfigMessage.getUnit().getUnitId());
        List<RSUConfigStatus> existingRsuConfigStatusList = existingTruConfig.getRsuConfigs();
        RsuConfigItemMessage rsuConfigItemMessage = truConfigMessage.getRsuConfigs().get(0);
        if(truConfigMessage.getRsuConfigs() != null && !truConfigMessage.getRsuConfigs().isEmpty() && truConfigMessage.getRsuConfigs().size() == 1) {
                log.info("Process TRU Config Message with Action: {}", rsuConfigItemMessage.getAction());
                if (rsuConfigItemMessage.getAction().equals("add")) {
                    RSUConfigStatus newRsuConfigStatus = new RSUConfigStatus();
                    newRsuConfigStatus.setEvent(rsuConfigItemMessage.getEvent());
                    newRsuConfigStatus.setRsuEndpoint(rsuConfigItemMessage.getRsuEndpoint());
                    newRsuConfigStatus.setStatus(null);
                    newRsuConfigStatus.setDataTypes(null);
                    newRsuConfigStatus.setTimestamp(truConfigMessage.getTimestamp());
                    newRsuConfigStatus.setTruConfigStatus(existingTruConfig);
                    existingTruConfig.getRsuConfigs().add(newRsuConfigStatus);
                    truConfigStatusRepository.save(existingTruConfig);
                     log.info("Added RSU Config IP: {} port: {} for TRU Unit ID: {}, TRU ID: {}",
                                    newRsuConfigStatus.getRsuEndpoint().getIp(),
                                    newRsuConfigStatus.getRsuEndpoint().getPort(),
                                    existingTruConfig.getUnitConfig().getUnitId(),
                                                            existingTruConfig.getId());
                }else if (rsuConfigItemMessage.getAction().equals("update") || rsuConfigItemMessage.getAction().equals("modify")) {
                    for (RSUConfigStatus rsuConfigStatus : existingRsuConfigStatusList) {
                        if (rsuConfigStatus.getRsuEndpoint().getIp().equals(rsuConfigItemMessage.getRsuEndpoint().getIp())
                                && rsuConfigStatus.getRsuEndpoint().getPort().equals(rsuConfigItemMessage.getRsuEndpoint().getPort())) {
                            rsuConfigStatus.setEvent(rsuConfigItemMessage.getEvent());
                            rsuConfigStatus.setTimestamp(Instant.now().toEpochMilli());
                            truConfigStatusRepository.save(existingTruConfig);
                            log.info("Updated RSU Config IP: {} port: {} for TRU of Unit ID: {}, TRU ID: {}",
                                    rsuConfigStatus.getRsuEndpoint().getIp(),
                                    rsuConfigStatus.getRsuEndpoint().getPort(),
                                    existingTruConfig.getUnitConfig().getUnitId(),
                                                            existingTruConfig.getId());
                            break;
                        }
                    }
                }else if (rsuConfigItemMessage.getAction().equals("remove") || rsuConfigItemMessage.getAction().equals("delete")) {
                    existingRsuConfigStatusList.removeIf(rsuConfigStatus -> {
                        boolean match = rsuConfigStatus.getRsuEndpoint().getIp().equals(rsuConfigItemMessage.getRsuEndpoint().getIp())
                                && rsuConfigStatus.getRsuEndpoint().getPort().equals(rsuConfigItemMessage.getRsuEndpoint().getPort());
                        if (match) {
                            rsuConfigStatus.setTruConfigStatus(null);
                        }
                        return match;
                    });
                    truConfigStatusRepository.save(existingTruConfig);
                    log.info("Removed RSU Config IP: {} port: {} from TRU of Unit ID: {}, TRU ID: {}",
                            rsuConfigItemMessage.getRsuEndpoint().getIp(),
                            rsuConfigItemMessage.getRsuEndpoint().getPort(),
                            existingTruConfig.getUnitConfig().getUnitId(),
                            existingTruConfig.getId());
                }
        }else{
            throw new IllegalArgumentException("Only one RSU config item is supported per TRU config message");
        }
    }
    
    public List<TRUConfigStatus> getAllTruConfigs() {
        return truConfigStatusRepository.findAll();
    }

    public TRUConfigStatus getTruConfigByUnitId(String unitId) {
        TRUConfigStatus res = truConfigStatusRepository.findByUnitConfig_UnitId(unitId);
        if (res == null) {
            res = truConfigStatusRepository.findByUnitId(unitId);
        }        
        return res;
    }
}
