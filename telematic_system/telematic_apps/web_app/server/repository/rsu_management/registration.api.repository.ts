import axios from 'axios';
import { RegistrationRepository } from '../../application/rsu_management/ports/registration.repository';
import { TruConfigMessage } from '../../models/rsu_management/tru_config_message.model';
import { TruConfigStatus } from '../../models/rsu_management/tru_config_status.model';
import { RSUConfigStatus } from '../../models/rsu_management/rsu_config_status.model';
import { UnitConfig } from '../../models/rsu_management/unit_config.model';
import { UnitPluginStatus } from '../../models/rsu_management/unit_plugin_status.model';
import { RSUEndpoint } from '../../models/rsu_management/rsu_endpoint.model';

export class RegistrationApiRepository implements RegistrationRepository {
    private readonly baseUrl: string;

    constructor(baseUrl: string = process.env.RSU_MANAGEMENT_SERVICE_URL || 'http://localhost:8082') {
        this.baseUrl = baseUrl;
    }

    async registerRsu(truConfigMessage: TruConfigMessage): Promise<any> {
        console.log(`Registering RSU with config: ${JSON.stringify(truConfigMessage)}`);
        try {
            const response = await axios.post(
                `${this.baseUrl}/api/registration/update-tru-config`,
                truConfigMessage
            );
            console.log(`RSU registration successful: ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to register RSU: ${error.message}`, error);
            throw new Error(`Failed to register RSU: ${error.message}`);
        }
    }

    async getAllTruConfig(): Promise<TruConfigStatus[]> {
        console.log('Fetching all TRU configuration statuses');
        try {
            const response = await axios.get(
                `${this.baseUrl}/api/registration/all-tru-registration-status`
            );
            console.log(`Retrieved ${response.data?.length || 0} TRU config statuses`);
            
            // Convert response data to TruConfigStatus instances
            const truConfigStatuses: TruConfigStatus[] = this.mapToTruConfigStatuses(response.data);
            
            return truConfigStatuses;
        } catch (error: any) {
            console.error(`Failed to get all TRU configs: ${error.message}`, error);
            throw new Error(`Failed to get all TRU configs: ${error.message}`);
        }
    }

    private mapToTruConfigStatuses(data: any[]): TruConfigStatus[] {
        if (!Array.isArray(data)) {
            console.warn('Response data is not an array, returning empty array');
            return [];
        }

        return data.map((item: any) => {
            // Map Unit Config
            const unitConfig = item.unitConfig ? new UnitConfig(
                item.unitConfig.unitId,
                item.unitConfig.name,
                item.unitConfig.maxConnections,
                item.unitConfig.pluginHeartbeatInterval,
                item.unitConfig.healthMonitorPluginHeartbeatInterval,
                item.unitConfig.rsuStatusMonitorInterval,
                item.unitConfig.timestamp
            ) : {} as UnitConfig;

            // Map RSU Configs
            const rsuConfigs: RSUConfigStatus[] = Array.isArray(item.rsuConfigs) 
                ? item.rsuConfigs.map((rsuConfig: any) => {
                    const rsuEndpoint = rsuConfig.rsu ? new RSUEndpoint(
                        rsuConfig.rsu.ip,
                        rsuConfig.rsu.port,
                        rsuConfig.rsu.timestamp
                    ) : {} as RSUEndpoint;

                    return new RSUConfigStatus(
                        rsuConfig.event,
                        rsuEndpoint,
                        rsuConfig.status,
                        rsuConfig.timestamp,
                        rsuConfig.id
                    );
                })
                : [];

            // Map Plugin Config Status
            const pluginConfigStatus = item.pluginConfigStatus ? new UnitPluginStatus(
                item.pluginConfigStatus.bridgePluginStatus,
                item.pluginConfigStatus.lastCommunicationTimestamp,
                item.pluginConfigStatus.timestamp,
                item.pluginConfigStatus.id
            ) : {} as UnitPluginStatus;

            return new TruConfigStatus(
                unitConfig,
                rsuConfigs,
                item.timestamp,
                pluginConfigStatus,
                item.id
            );
        });
    }
}