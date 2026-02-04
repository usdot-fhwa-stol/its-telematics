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
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
} from '@mui/material';
import SettingsInputAntennaIcon from '@mui/icons-material/SettingsInputAntenna';

/**
 * RSU Selector Component
 * Allows users to select an RSU within the selected TRU
 */
const RSUSelector = ({ rsuList, selectedRSU, onSelect, disabled }) => {
  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsInputAntennaIcon color="primary" />
        Select RSU
      </Typography>
      
      {disabled ? (
        <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
          Please select a TRU first
        </Typography>
      ) : rsuList.length === 0 ? (
        <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
          No RSUs available for this TRU
        </Typography>
      ) : (
        <List>
          {rsuList.map((rsu, index) => {
            const rsuKey = `${rsu.ip}:${rsu.port}`;
            const isSelected = selectedRSU && 
              selectedRSU.ip === rsu.ip && 
              selectedRSU.port === rsu.port;
              
            return (
              <ListItem key={rsuKey} disablePadding>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => onSelect(rsu)}
                >
                  <ListItemText
                    primary={rsuKey}
                    secondary={`IP: ${rsu.ip} | Port: ${rsu.port}`}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      )}
    </Paper>
  );
};

export default RSUSelector;
