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
import axios from 'axios';
import { DataSelectionRepository } from '../../application/rsu_management/ports/data_selection.repository';
import { RSUEndpoint } from '../../models/rsu_management/rsu_endpoint.model';
import { RSUTopicsMessage } from '../../models/rsu_management/rsu_topics_message.model';
import { TopicMessage } from '../../models/rsu_management/topic_message.model';
import { TRUTopicsMessage } from '../../models/rsu_management/tru_topics_message.model';

export class DataSelectionApiRepository implements DataSelectionRepository {
    private readonly baseUrl: string;

    constructor(baseUrl: string = process.env.RSU_MANAGEMENT_SERVICE_URL || 'http://localhost:8083') {
        this.baseUrl = baseUrl;
    }

    async getAvailableTopics(truTopicsMessage: TRUTopicsMessage): Promise<TRUTopicsMessage> {
        console.log(`Getting available topics for unit: ${truTopicsMessage.unitId}`);
        try {
            const response = await axios.get(
                `${this.baseUrl}/api/data-selection/available-topics`,
                {
                    data: truTopicsMessage
                }
            );
            console.log(`Retrieved available topics: ${JSON.stringify(response.data)}`);
            
            // Convert response data to TRUTopicsMessage instance
            const truTopics: TRUTopicsMessage = this.mapToTRUTopicsMessage(response.data);
            
            return truTopics;
        } catch (error: any) {
            this.handleAxiosError('Failed to get available topics', error);
        }
    }

    async confirmDataSelection(truTopicsMessage: TRUTopicsMessage): Promise<TRUTopicsMessage> {
        console.log(`Requesting Data selection to confirm: ${JSON.stringify(truTopicsMessage)}`);
        try {
            const response = await axios.post(
                `${this.baseUrl}/api/data-selection/confirm-topics`,
                truTopicsMessage
            );
            console.log(`Response Data selection confirmed: ${JSON.stringify(response.data)}`);
            
            // Convert response data to TRUTopicsMessage instance
            const truTopics: TRUTopicsMessage = this.mapToTRUTopicsMessage(response.data);
            
            return truTopics;
        } catch (error: any) {
            this.handleAxiosError('Failed to confirm data selection', error);
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

    private mapToTRUTopicsMessage(data: any): TRUTopicsMessage {
        if (!data) {
            console.warn('Response data is null or undefined, returning empty TRUTopicsMessage');
            return new TRUTopicsMessage('', [], Date.now());
        }

        // Map RSU Topics
        const rsuTopics: RSUTopicsMessage[] = Array.isArray(data.rsuTopics)
            ? data.rsuTopics.map((rsuTopic: any) => {
                // Map Topics
                const topics: TopicMessage[] = Array.isArray(rsuTopic.topics)
                    ? rsuTopic.topics.map((topic: any) => 
                        new TopicMessage(topic.name, topic.selected || false)
                    )
                    : [];

                const endpoint = rsuTopic.rsu;
                const rsu = endpoint
                    ? new RSUEndpoint(
                        endpoint.ip ?? endpoint.IP ?? '',
                        endpoint.port ?? endpoint.Port ?? 0
                    )
                    : {} as RSUEndpoint;

                return new RSUTopicsMessage(topics, rsu);
            })
            : [];

        return new TRUTopicsMessage(
            data.unitId || '',
            rsuTopics,
            data.timestamp || Date.now()
        );
    }
}
