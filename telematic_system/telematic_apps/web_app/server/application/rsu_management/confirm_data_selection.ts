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
import { TRUTopicsMessage } from '../../models/rsu_management/tru_topics_message.model';
import { DataSelectionRepository } from './ports/data_selection.repository';

export class ConfirmDataSelection {
    private readonly dataSelectionRepository: DataSelectionRepository;

    constructor(dataSelectionRepository: DataSelectionRepository) {
        this.dataSelectionRepository = dataSelectionRepository;
    }

    async execute(truTopicsMessage: TRUTopicsMessage): Promise<TRUTopicsMessage> {
        console.log('ConfirmDataSelection: Starting to confirm data selection');
        
        if (!truTopicsMessage) {
            throw new Error('TRUTopicsMessage is required');
        }

        if (!truTopicsMessage.unitId) {
            throw new Error('Unit ID is required');
        }

        // Allow empty rsuTopics for stop broadcast functionality
        if (!truTopicsMessage.rsuTopics) {
            truTopicsMessage.rsuTopics = [];
        }

        const hasSelectedTopics = truTopicsMessage.rsuTopics.some(rsu => 
            rsu.topics?.some(topic => topic.selected)
        );

        if (hasSelectedTopics) {
            console.log(`ConfirmDataSelection: Confirming data selection for unit ${truTopicsMessage.unitId}`);
        } else {
            console.log(`ConfirmDataSelection: Stopping broadcast for unit ${truTopicsMessage.unitId} - no topics selected`);
        }
        
        const result = await this.dataSelectionRepository.confirmDataSelection(truTopicsMessage);
        
        console.log('ConfirmDataSelection: Data selection confirmed successfully');
        return result;
    }
}
