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
import { TruConfigMessage } from "../../models/rsu_management/tru_config_message.model";
import { RegistrationApiRepository } from "../../repository/rsu_management/registration.api.repository";

export class RemoveRSU{
    private readonly registrationRepository: RegistrationApiRepository;
    
    constructor(registrationRepository: RegistrationApiRepository){
        this.registrationRepository = registrationRepository;
    }

    async execute(truConfigMessage: TruConfigMessage): Promise<any> {
        console.log('RemoveRSU: Starting RSU removal process');
        
        if (!truConfigMessage) {
            throw new Error('TruConfigMessage is required');
        }

        if (!truConfigMessage.unitConfig) {
            throw new Error('Unit configuration is required');
        }

        if (!truConfigMessage.rsuConfigs || truConfigMessage.rsuConfigs.length === 0) {
            throw new Error('At least one RSU configuration is required for removal');
        }

        console.log(`RemoveRSU: Removing ${truConfigMessage.rsuConfigs.length} RSU(s) from unit ${truConfigMessage.unitConfig.unitId}`);
        
        const result = await this.registrationRepository.registerRsu(truConfigMessage);
        
        console.log('RemoveRSU: RSU removal completed successfully');
        return result;
    }

}