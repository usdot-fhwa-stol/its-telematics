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
import { Application, Router } from 'express';
import { ConfirmDataSelection } from '../../application/rsu_management/confirm_data_selection';
import { GetAvailableTopics } from '../../application/rsu_management/get_available_topics';
import { DataSelectionController } from '../../controllers/rsu_management/data_selection.controller';
import { DataSelectionApiRepository } from '../../repository/rsu_management/data_selection.api.repository';

export = (app: Application) => {
    const router = Router();

    // Initialize repository
    const dataSelectionRepository = new DataSelectionApiRepository();

    // Initialize application services
    const getAvailableTopicsApp = new GetAvailableTopics(dataSelectionRepository);
    const confirmDataSelectionApp = new ConfirmDataSelection(dataSelectionRepository);

    // Initialize controller
    const dataSelectionController = new DataSelectionController(
        getAvailableTopicsApp,
        confirmDataSelectionApp
    );

    // Define routes
    router.post('/available-topics', dataSelectionController.getAvailableTopics);
    router.post('/confirm-topics', dataSelectionController.confirmDataSelection);

    app.use('/api/data-selection', router);
};
