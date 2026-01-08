import { RegistrationRepository } from './ports/registration.repository';
import { TruConfigMessage } from '../../models/rsu_management/tru_config_message.model';

export class AssignRSU {
    private readonly registrationRepository: RegistrationRepository;

    constructor(registrationRepository: RegistrationRepository) {
        this.registrationRepository = registrationRepository;
    }

    async execute(truConfigMessage: TruConfigMessage): Promise<any> {
        console.log('AssignRSU: Starting RSU assignment process');
        
        if (!truConfigMessage) {
            throw new Error('TruConfigMessage is required');
        }

        if (!truConfigMessage.unitConfig) {
            throw new Error('Unit configuration is required');
        }

        if (!truConfigMessage.rsuConfigs || truConfigMessage.rsuConfigs.length === 0) {
            throw new Error('At least one RSU configuration is required');
        }

        console.log(`AssignRSU: Assigning ${truConfigMessage.rsuConfigs.length} RSU(s) to unit ${truConfigMessage.unitConfig.unitId}`);
        
        const result = await this.registrationRepository.registerRsu(truConfigMessage);
        
        console.log('AssignRSU: RSU assignment completed successfully');
        return result;
    }
}