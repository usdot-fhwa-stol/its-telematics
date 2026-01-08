import { TruConfigMessage } from "../../../models/rsu_management/tru_config_message.model";
import { TruConfigStatus } from "../../../models/rsu_management/tru_config_status.model";

export interface RegistrationRepository {
    registerRsu(TruConfigMessage: TruConfigMessage): Promise<any>;
    getAllTruConfig(): Promise<TruConfigStatus[]>;
}