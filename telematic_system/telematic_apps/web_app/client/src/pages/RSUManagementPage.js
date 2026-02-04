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

import React from 'react';
import { Grid } from '@mui/material';
import SettingsInputAntennaIcon from '@mui/icons-material/SettingsInputAntenna';
import { PageAvatar } from '../components/ui/PageAvatar';
import RSUManagementLayout from '../components/rsu_management/common/RSUManagementLayout';

const RSUManagementPage = React.memo(() => {
  return (
    <React.Fragment>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <PageAvatar icon={<SettingsInputAntennaIcon />} title="RSU Management" />
        </Grid>
        <Grid item xs={12}>
          <RSUManagementLayout />
        </Grid>
      </Grid>
    </React.Fragment>
  );
});

export default RSUManagementPage;
