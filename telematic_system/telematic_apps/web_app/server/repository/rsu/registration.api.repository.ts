import axios from 'axios';
import { RegistrationRepository } from '../../application/rsu_management/ports/registration.repository';
import { TruConfigMessage } from '../../models/rsu_management/tru_config_message.model';
import { TruConfigStatus } from '../../models/rsu_management/tru_config_status.model';

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
            console.error(`Failed to register RSU: ${error.message}`, error);
            throw new Error(`Failed to register RSU: ${error.message}`);
        }
    }

    async getAllTruConfig(): Promise<TruConfigStatus[]> {
        console.log('Fetching all TRU configuration statuses');
        try {
            const response = await axios.get(
                `${this.baseUrl}/api/registration/all-tru-registration-status`
            );
            console.log(`Retrieved ${response.data?.length || 0} TRU config statuses`);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to get all TRU configs: ${error.message}`, error);
            throw new Error(`Failed to get all TRU configs: ${error.message}`);
        }
    }
}