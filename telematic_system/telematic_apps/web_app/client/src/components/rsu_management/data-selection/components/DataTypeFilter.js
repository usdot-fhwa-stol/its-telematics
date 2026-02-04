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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';

/**
 * Data Type Filter Component
 * Allows filtering topics by data type
 */
const DataTypeFilter = ({ value, onChange, disabled }) => {
  const dataTypes = [
    { value: 'all', label: 'All Topics' },
    { value: 'bsm', label: 'BSM (Basic Safety Message)' },
    { value: 'tim', label: 'TIM (Traveler Information Message)' },
    { value: 'spat', label: 'SPaT (Signal Phase and Timing)' },
    { value: 'map', label: 'MAP (Map Data)' },
    { value: 'psm', label: 'PSM (Personal Safety Message)' },
    { value: 'srm', label: 'SRM (Signal Request Message)' },
    { value: 'ssm', label: 'SSM (Signal Status Message)' },
  ];

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FilterListIcon color="primary" />
        Filter by Data Type
      </Typography>
      
      <FormControl fullWidth disabled={disabled}>
        <InputLabel>Data Type</InputLabel>
        <Select
          value={value}
          label="Data Type"
          onChange={(e) => onChange(e.target.value)}
        >
          {dataTypes.map((type) => (
            <MenuItem key={type.value} value={type.value}>
              {type.label}
            </MenuItem>
          ))}
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
