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

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SettingsInputAntennaIcon from '@mui/icons-material/SettingsInputAntenna';
import {
    Box,
    Checkbox,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
    Tooltip,
    Typography
} from '@mui/material';

/**
 * RSU Selector Component
 * Allows users to select multiple RSUs within the selected TRU
 */
const RSUSelector = ({ rsuList, selectedRSUs = [], onSelect, disabled }) => {
  const isRSUSelected = (rsu) => {
    return selectedRSUs.some(selected => 
      selected.ip === rsu.ip
    );
  };

  const handleToggle = (rsu) => {
    const isSelected = isRSUSelected(rsu);
    if (isSelected) {
      // Remove RSU from selection (match by IP only)
      onSelect(selectedRSUs.filter(selected => 
        selected.ip !== rsu.ip
      ));
    } else {
      // Add RSU to selection
      onSelect([...selectedRSUs, rsu]);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsInputAntennaIcon sx={{ color: '#748c93' }} />
          Select RSU(s)
          <Tooltip title="Roadside Unit (RSU) - Infrastructure equipment that transmits and receives V2X messages at roadside locations" arrow>
            <InfoOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary', cursor: 'help' }} />
          </Tooltip>
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {selectedRSUs.length} of {rsuList.length} selected
        </Typography>
      </Box>
      
      {disabled ? (
        <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
          Please select a TRU first
        </Typography>
      ) : rsuList.length === 0 ? (
        <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
          No RSUs available for this TRU
        </Typography>
      ) : (
        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
          {rsuList.map((rsu) => {
            const rsuKey = `${rsu.ip}:${rsu.port}`;
            const isSelected = isRSUSelected(rsu);
              
            return (
              <ListItem key={rsuKey} disablePadding dense>
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={isSelected}
                    tabIndex={-1}
                    disableRipple
                    onChange={() => handleToggle(rsu)}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={rsu.ip}
                />
              </ListItem>
            );
          })}
        </List>
      )}
    </Paper>
  );
};

export default RSUSelector;
