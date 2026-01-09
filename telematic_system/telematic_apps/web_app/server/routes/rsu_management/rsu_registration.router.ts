/*
 * Copyright (C) 2025 LEIDOS.
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
import { Application, Router } from 'express';
import { RegistrationController } from '../../controllers/rsu_management/registration.controller';
import { AssignRSU } from '../../application/rsu_management/assign_rsu';
import { RemoveRSU } from '../../application/rsu_management/remove_rsu';
import { UpdateRSUConfig } from '../../application/rsu_management/update_rsu_config';
import { AllRsuRegistrationStatus } from '../../application/rsu_management/all_rsu_registration_status';
import { RegistrationApiRepository } from '../../repository/rsu_management/registration.api.repository';

export = (app: Application) => {
    const router = Router();

    // Initialize repository
    const registrationRepository = new RegistrationApiRepository();

    // Initialize application services
    const assignRSUApp = new AssignRSU(registrationRepository);
    const removeRSUApp = new RemoveRSU(registrationRepository);
    const updateRSUConfigApp = new UpdateRSUConfig(registrationRepository);
    const allRsuRegistrationStatusApp = new AllRsuRegistrationStatus(registrationRepository);

    // Initialize controller
    const registrationController = new RegistrationController(
        assignRSUApp,
        removeRSUApp,
        updateRSUConfigApp,
        allRsuRegistrationStatusApp
    );

    // Define routes
    router.post('/assign-rsu', registrationController.assignRSU);
    router.post('/remove-rsu', registrationController.removeRSUAssignment);
    router.post('/update-rsu-config', registrationController.updateRSUConfig);
    router.get('/all-tru-config', registrationController.getAllTruConfig);

    app.use('/api/rsu-registration', router);
};
