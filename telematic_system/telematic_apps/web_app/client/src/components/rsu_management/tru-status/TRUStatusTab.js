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

import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import StatusTable from '../common/StatusTable';
import useHardwareStatus from '../hooks/useHardwareStatus';
import TRUFilters from './components/TRUFilters';

/**
 * TRU Status Tab Component
 * Main entry point for the TRU Status tab
 */
const TRUStatusTab = () => {
  const {
    filteredList,
    loading,
    filters,
    updateFilters,
    getOnlineCount,
    getOfflineCount,
    refresh,
  } = useHardwareStatus('tru');

  const columns = [
    {
      field: 'unitId',
      headerName: 'Unit ID',
      flex: 1,
      render: (row) => row.unitConfig?.unitId || '-',
    },
    {
      field: 'bridgePluginStatus',
      headerName: 'Bridge Status',
      flex: 1,
      render: (row) => (
        <Chip
          label={row.unitConfig?.bridgePluginStatus || 'Unknown'}
          size="small"
          color={row.unitConfig?.bridgePluginStatus === 'Running' ? 'success' : 'error'}
        />
      ),
    },
    {
      field: 'rsuCount',
      headerName: 'RSU Count',
      flex: 0.7,
      render: (row) => {
        const count = row.rsuConfigs?.length || 0;
        const operationalCount = row.rsuConfigs?.filter(rsu => rsu.Status === 'operation').length || 0;
        return (
          <Chip
            label={`${operationalCount}/${count}`}
            size="small"
            color={count > 0 ? 'primary' : 'default'}
          />
        );
      },
    },
    {
      field: 'lastUpdated',
      headerName: 'Last Updated',
      type: 'timestamp',
      flex: 1,
      render: (row) => {
        const timestamp = row.unitConfig?.lastUpdatedTimestamp;
        if (!timestamp) return '-';
        return new Date(timestamp).toLocaleString();
      },
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            TRU Status Monitoring
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip
              label={`Online: ${getOnlineCount()}`}
              color="success"
              size="small"
            />
            <Chip
              label={`Offline: ${getOfflineCount()}`}
              color="error"
              size="small"
            />
          </Stack>
        </Box>
        <Tooltip title="Refresh">
          <IconButton color="primary" onClick={refresh}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filters */}
      <TRUFilters filters={filters} onFilterChange={updateFilters} />

      {/* Table */}
      <StatusTable
        data={filteredList}
        columns={columns}
        loading={loading}
        emptyMessage="No TRUs found in the system."
      />
    </Box>
  );
};

export default TRUStatusTab;
