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
import { NextFunction, Request, Response } from "express";
import { ConfirmDataSelection } from "../../application/rsu_management/confirm_data_selection";
import { GetAvailableTopics } from "../../application/rsu_management/get_available_topics";
import { RSUEndpoint } from "../../models/rsu_management/rsu_endpoint.model";
import { RSUTopicsMessage } from "../../models/rsu_management/rsu_topics_message.model";
import { TopicMessage } from "../../models/rsu_management/topic_message.model";
import { TRUTopicsMessage } from "../../models/rsu_management/tru_topics_message.model";

export class DataSelectionController {
    private readonly getAvailableTopicsApp: GetAvailableTopics;
    private readonly confirmDataSelectionApp: ConfirmDataSelection;
    
    constructor(
        getAvailableTopicsApp: GetAvailableTopics,
        confirmDataSelectionApp: ConfirmDataSelection
    ) {
        this.getAvailableTopicsApp = getAvailableTopicsApp;
        this.confirmDataSelectionApp = confirmDataSelectionApp;
    }

    getAvailableTopics = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
        console.log('DataSelectionController: Received get available topics request');
        
        try {
            const truTopicsMessage: TRUTopicsMessage | null = this.mapToTRUTopicsMessage(req.body);
            
            if (!truTopicsMessage) {
                console.error('DataSelectionController: Missing request body');
                return res.status(400).send({ 
                    error: "Request body is required",
                    message: "TRUTopicsMessage must be provided in the request body"
                });
            }

            console.log(`DataSelectionController: Processing available topics request for unit ${truTopicsMessage.unitId}`);
            
            const result = await this.getAvailableTopicsApp.execute(truTopicsMessage);
            
            console.log('DataSelectionController: Available topics retrieved successfully');
            res.status(200).send({ 
                message: "Available topics retrieved successfully",
                data: result
            });
        } catch (error: any) {
            console.error(`DataSelectionController: Failed to get available topics - ${error.message}`, error);
            res.status(500).send({ 
                error: "Failed to get available topics",
                message: error.message
            });
        }
    }

    confirmDataSelection = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
        console.log('DataSelectionController: Received confirm data selection request');
        
        try {
            const truTopicsMessage: TRUTopicsMessage | null = this.mapToTRUTopicsMessage(req.body);
            
            if (!truTopicsMessage) {
                console.error('DataSelectionController: Missing request body');
                return res.status(400).send({ 
                    error: "Request body is required",
                    message: "TRUTopicsMessage must be provided in the request body"
                });
            }

            console.log(`DataSelectionController: Processing confirm data selection for unit ${truTopicsMessage.unitId}`);
            
            const result = await this.confirmDataSelectionApp.execute(truTopicsMessage);
            
            console.log('DataSelectionController: Data selection confirmed successfully');
            res.status(200).send({ 
                message: "Data selection confirmed successfully",
                data: result
            });
        } catch (error: any) {
            console.error(`DataSelectionController: Failed to confirm data selection - ${error.message}`, error);
            res.status(500).send({ 
                error: "Failed to confirm data selection",
                message: error.message
            });
        }
    }

    private mapToTRUTopicsMessage(body: any): TRUTopicsMessage | null {
        if (!body) {
            return null;
        }

        try {
            const rsuTopics: RSUTopicsMessage[] = Array.isArray(body.rsuTopics)
                ? body.rsuTopics.map((rsuTopic: any) => {
                    const topics: TopicMessage[] = Array.isArray(rsuTopic.topics)
                        ? rsuTopic.topics.map((topic: any) =>
                            new TopicMessage(topic.name, topic.selected || false)
                        )
                        : [];

                    const rsu = rsuTopic.rsu
                        ? new RSUEndpoint(
                            rsuTopic.rsu.ip ?? '',
                            rsuTopic.rsu.port ?? 0
                        )
                        : {} as RSUEndpoint;

                    return new RSUTopicsMessage(topics, rsu);
                })
                : [];

            return new TRUTopicsMessage(
                body.unitId || '',
                rsuTopics,
                body.timestamp || Date.now()
            );
        } catch (error) {
            console.error('Failed to map request body to TRUTopicsMessage:', error);
            return null;
        }
    }
}
