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