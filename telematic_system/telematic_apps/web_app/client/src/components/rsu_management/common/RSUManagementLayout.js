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

import { Box, Paper, Tab, Tabs } from '@mui/material';
import { useState } from 'react';
import DataSelectionTab from '../data-selection/DataSelectionTab';
import RSUStatusTab from '../rsu-status/RSUStatusTab';
import TRUStatusTab from '../tru-status/TRUStatusTab';

/**
 * RSU Management Layout Component
 * Main container that handles tabs for RSU, TRU, and Data Selection
 */
const RSUManagementLayout = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Paper elevation={3}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="RSU Status" />
          <Tab label="Data Selection" />
          <Tab label="TRU Status" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && <RSUStatusTab />}
          {activeTab === 1 && <DataSelectionTab />}
          {activeTab === 2 && <TRUStatusTab />}
        </Box>
      </Paper>
    </Box>
  );
};

export default RSUManagementLayout;
