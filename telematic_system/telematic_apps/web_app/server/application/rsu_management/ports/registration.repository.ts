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
import { TruConfigMessage } from "../../../models/rsu_management/tru_config_message.model";
import { TruConfigStatus } from "../../../models/rsu_management/tru_config_status.model";

export interface RegistrationRepository {
    registerRsu(TruConfigMessage: TruConfigMessage): Promise<any>;
    getAllTruConfig(): Promise<TruConfigStatus[]>;
}