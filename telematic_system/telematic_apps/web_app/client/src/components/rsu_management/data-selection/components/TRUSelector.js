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

import RouterIcon from '@mui/icons-material/Router';
import {
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Typography
} from '@mui/material';

/**
 * TRU Selector Component
 * Allows users to select a TRU for data configuration
 */
const TRUSelector = ({ truList, selectedTRU, onSelect }) => {
  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <RouterIcon color="primary" />
        Select TRU
      </Typography>
      
      {truList.length === 0 ? (
        <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
          No TRUs available
        </Typography>
      ) : (
        <List>
          {truList.map((tru) => (
            <ListItem key={tru.unitId} disablePadding>
              <ListItemButton
                selected={selectedTRU === tru.unitId}
                onClick={() => onSelect(tru.unitId)}
              >
                <ListItemText
                  primary={tru.unitId}
                  secondary={tru.name || 'No name'}
                />
                <Chip
                  label={`${tru.rsuCount} RSU${tru.rsuCount !== 1 ? 's' : ''}`}
                  size="small"
                  color={tru.rsuCount > 0 ? 'primary' : 'default'}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default TRUSelector;
