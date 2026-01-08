import { RegistrationRepository } from './ports/registration.repository';
import { TruConfigStatus } from '../../models/rsu_management/tru_config_status.model';

export class AllRsuRegistrationStatus {
    private readonly registrationRepository: RegistrationRepository;

    constructor(registrationRepository: RegistrationRepository) {
        this.registrationRepository = registrationRepository;
    }

    async execute(): Promise<TruConfigStatus[]> {
        console.log('AllRsuRegistrationStatus: Fetching all TRU registration statuses');
        
        const result = await this.registrationRepository.getAllTruConfig();
        
        console.log(`AllRsuRegistrationStatus: Retrieved ${result.length} TRU configuration status(es)`);
        return result;
    }
}