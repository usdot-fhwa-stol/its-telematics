<<<<<<< HEAD
/*
 * Copyright (C) 2026 LEIDOS.
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
=======
>>>>>>> 0cbe6a1 (registration api)
import axios from 'axios';
import { RegistrationRepository } from '../../application/rsu_management/ports/registration.repository';
import { RSUConfigStatus } from '../../models/rsu_management/rsu_config_status.model';
import { RSUEndpoint } from '../../models/rsu_management/rsu_endpoint.model';
import { TruConfigMessage } from '../../models/rsu_management/tru_config_message.model';
import { TruConfigStatus } from '../../models/rsu_management/tru_config_status.model';
import { UnitConfig } from '../../models/rsu_management/unit_config.model';
import { UnitPluginStatus } from '../../models/rsu_management/unit_plugin_status.model';

export class RegistrationApiRepository implements RegistrationRepository {
    private readonly baseUrl: string;

    constructor(baseUrl: string = process.env.RSU_MANAGEMENT_SERVICE_URL || 'http://localhost:8083') {
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
<<<<<<< HEAD
            this.handleAxiosError('Failed to register RSU', error);
=======
            console.error(`Failed to register RSU: ${error.message}`, error);
            throw new Error(`Failed to register RSU: ${error.message}`);
>>>>>>> 0cbe6a1 (registration api)
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
<<<<<<< HEAD
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

=======
            console.error(`Failed to get all TRU configs: ${error.message}`, error);
            throw new Error(`Failed to get all TRU configs: ${error.message}`);
        }
    }

>>>>>>> 0cbe6a1 (registration api)
    private mapToTruConfigStatuses(data: any[]): TruConfigStatus[] {
        if (!Array.isArray(data)) {
            console.warn('Response data is not an array, returning empty array');
            return [];
        }

        return data.map((item: any) => {
<<<<<<< HEAD
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
                      const rsuJson = rsuConfig.rsu || {};
                      const rsu = rsuJson
                          ? new RSUEndpoint(
                                    rsuJson.ip,
                                    rsuJson.port
                                )
                          : ({} as RSUEndpoint);

                      return new RSUConfigStatus(
                          rsuConfig.event,
                          rsu,
                          rsuConfig.status,
                          rsuConfig.timestamp
                      );
                  })
                : [];

            // Map Plugin Config Status
			const pluginJson = item.pluginConfigStatus || {};
            const pluginConfigStatus = pluginJson
                ? new UnitPluginStatus(
					  pluginJson.bridgePluginStatus,
					  pluginJson.lastCommunicationTimestamp,
                      pluginJson.timestamp
                  )
                : ({} as UnitPluginStatus);
=======
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
>>>>>>> 0cbe6a1 (registration api)

            return new TruConfigStatus(
                unitConfig,
                rsuConfigs,
                item.timestamp,
<<<<<<< HEAD
                pluginConfigStatus
=======
                pluginConfigStatus,
                item.id
>>>>>>> 0cbe6a1 (registration api)
            );
        });
    }
}