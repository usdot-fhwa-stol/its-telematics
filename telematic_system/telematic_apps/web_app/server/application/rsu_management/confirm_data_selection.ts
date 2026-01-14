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
import { DataSelectionRepository } from './ports/data_selection.repository';
import { TRUTopicsMessage } from '../../models/rsu_management/tru_topics_message.model';

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

        if (!truTopicsMessage.rsuTopics || truTopicsMessage.rsuTopics.length === 0) {
            throw new Error('At least one RSU topic configuration is required');
        }

        console.log(`ConfirmDataSelection: Confirming data selection for unit ${truTopicsMessage.unitId}`);
        
        const result = await this.dataSelectionRepository.confirmDataSelection(truTopicsMessage);
        
        console.log('ConfirmDataSelection: Data selection confirmed successfully');
        return result;
    }
}
