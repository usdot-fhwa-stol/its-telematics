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

import FilterListIcon from '@mui/icons-material/FilterList';
import {
  FormControl,
  InputLabel,
  ListSubheader,
  MenuItem,
  Paper,
  Select,
  Typography
} from '@mui/material';

/**
 * Data Type Filter Component
 * Allows filtering topics by data type, organized by RSU
 */
const DataTypeFilter = ({ value, onChange, disabled, availableDataTypes = [] }) => {
  const handleChange = (event) => {
    const newValue = event.target.value;
    
    // If "all" is selected, clear other selections and only keep "all"
    if (newValue.includes('all') && !value.includes('all')) {
      onChange(['all']);
    }
    // If any other option is selected while "all" is present, remove "all"
    else if (newValue.includes('all') && value.includes('all') && newValue.length > 1) {
      onChange(newValue.filter(v => v !== 'all'));
    }
    // If all selections are removed, default to "all"
    else if (newValue.length === 0) {
      onChange(['all']);
    }
    // Otherwise, use the new value as is
    else {
      onChange(newValue);
    }
  };

  const renderSelectedValue = (selected) => {
    if (selected.includes('all')) {
      return 'All Available Data Types';
    }
    // Extract and display unique data type names from RSU-specific values
    const dataTypeNames = selected
      .filter(v => v !== 'all')
      .map(v => {
        const parts = v.split('-');
        return parts.length > 1 ? parts.slice(1).join('-').toUpperCase() : v.toUpperCase();
      });
    return dataTypeNames.length > 0 ? dataTypeNames.join(', ') : 'All Available Data Types';
  };

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FilterListIcon sx={{ color: '#748c93' }} />
        Filter by Available Data Types
      </Typography>
      
      <FormControl fullWidth disabled={disabled}>
        <InputLabel>Available Data Types</InputLabel>
        <Select
          multiple
          value={value}
          label="Available Data Types"
          onChange={handleChange}
          renderValue={renderSelectedValue}>
          <MenuItem key="all" value="all">
            All Available Data Types
          </MenuItem>
          {availableDataTypes.map((rsuGroup) => [
            <ListSubheader key={`header-${rsuGroup.rsuKey}`}>
              {rsuGroup.rsuKey.split(':')[0]}
            </ListSubheader>,
            ...rsuGroup.topics.map((topic) => (
              <MenuItem key={`${rsuGroup.rsuKey}-${topic}`} value={`${rsuGroup.rsuKey}-${topic}`} sx={{ pl: 4 }}>
                {topic.toUpperCase()}
              </MenuItem>
            ))
          ])}
        </Select>
      </FormControl>
      
      {disabled && (
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          Please select TRU and RSU to enable filtering
        </Typography>
      )}
    </Paper>
  );
};

export default DataTypeFilter;
