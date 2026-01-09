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
            this.handleAxiosError('Failed to register RSU', error);
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
            this.handleAxiosError('Failed to get all TRU configs', error);
        }
    }

    private handleAxiosError(prefix: string, error: any): never {
        const status = error?.response?.status;
        const data = error?.response?.data;
        const backendError = data?.error;
        const backendDetails = data?.details;

        const statusPart = status ? ` (${status})` : '';
        let message = `${prefix}${statusPart}`;

        if (backendError || backendDetails) {
            const parts: string[] = [];
            if (backendError) {
                parts.push(backendError);
            }
            if (backendDetails) {
                parts.push(backendDetails);
            }
            message += `: ${parts.join(' - ')}`;
        } else if (error?.message) {
            message += `: ${error.message}`;
        }

        console.error(message, error);
        throw new Error(message);
    }

    private mapToTruConfigStatuses(data: any[]): TruConfigStatus[] {
        if (!Array.isArray(data)) {
            console.warn('Response data is not an array, returning empty array');
            return [];
        }

        return data.map((item: any) => {
            // Map Unit Config (camelCase from Java)
            const unitJson = item.unitConfig || {};
            const unitConfig = unitJson
                ? new UnitConfig(
                      unitJson.unitId,
                      unitJson.name,
                      unitJson.maxConnections,
                      unitJson.pluginHeartbeatInterval,
                      unitJson.healthMonitorPluginHeartbeatInterval,
                      unitJson.rsuStatusMonitorInterval,
                      unitJson.timestamp,
                  )
                : ({} as UnitConfig);

            // Map RSU Configs
            const rsuArray = item.rsuConfigs || [];
            const rsuConfigs: RSUConfigStatus[] = Array.isArray(rsuArray)
                ? rsuArray.map((rsuConfig: any) => {
                      const rsuJson = rsuConfig.rsu || rsuConfig.rsuEndpoint || {};
                      const rsuEndpoint = rsuJson
                          ? new RSUEndpoint(
                                    rsuJson.ip,
                                    rsuJson.port,
                                rsuJson.timestamp,
                            )
                          : ({} as RSUEndpoint);

                      return new RSUConfigStatus(
                          rsuConfig.event,
                          rsuEndpoint,
                          rsuConfig.status,
                          rsuConfig.timestamp,
                          rsuConfig.id,
                      );
                  })
                : [];

            // Map Plugin Config Status
			const pluginJson = item.pluginConfigStatus || {};
            const pluginConfigStatus = pluginJson
                ? new UnitPluginStatus(
					  pluginJson.bridgePluginStatus,
					  pluginJson.lastCommunicationTimestamp,
                      pluginJson.timestamp,
                      pluginJson.id,
                  )
                : ({} as UnitPluginStatus);

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