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
import { useTRUStatus } from '../../../context/TRUStatusContext';
import StatusTable from '../common/StatusTable';
import TRUFilters from './components/TRUFilters';

/**
 * TRU Status Tab Component
 * Main entry point for the TRU Status tab
 */
const TRUStatusTab = () => {
  const {
    filteredStatuses,
    loading,
    filters,
    updateFilters,
    getStatusCount,
    refresh,
  } = useTRUStatus();

  const columns = [
    {
      field: 'unitId',
      headerName: 'TRU ID',
      flex: 0.8,
      render: (row) => row.unitConfig?.unitId || '-',
    },
    {
      field: 'unitName',
      headerName: 'Name',
      flex: 1.2,
      render: (row) => row.unitConfig?.name || '-',
    },
    {
      field: 'bridgePluginStatus',
      headerName: 'Bridge Status',
      flex: 0.8,
      render: (row) => {
        const status = row.pluginConfigStatus?.bridgePluginStatus || 'unknown';
        return (
          <Chip
            label={status.charAt(0).toUpperCase() + status.slice(1)}
            size="small"
            color={status.toLowerCase() === 'running' ? 'success' : 'error'}
          />
        );
      },
    },
    {
      field: 'rsuIPs',
      headerName: 'Associated RSU IPs',
      flex: 1.5,
      render: (row) => {
        const ips = row.rsuConfigs?.map(rsu => rsu.rsu?.ip).filter(Boolean) || [];
        return ips.length > 0 ? ips.join(', ') : '-';
      },
    },
    {
      field: 'currentConnections',
      headerName: 'Current RSU Connections',
      flex: 1,
      render: (row) => {
        const count = row.rsuConfigs?.length || 0;
        return count;
      },
    },
    {
      field: 'maxConnections',
      headerName: 'Max Allowed RSU Connections',
      flex: 1.2,
      render: (row) => row.unitConfig?.maxConnections || '-',
    },
    {
      field: 'lastUpdated',
      headerName: 'Last Updated',
      type: 'timestamp',
      flex: 1,
      render: (row) => {
        const timestamp = row.pluginConfigStatus?.lastCommunicationTimestamp || null;
        if (!timestamp) return '-';
        return new Date(timestamp).toLocaleString();
      },
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5" gutterBottom>
            TRU Status Monitoring
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            A Telematic Roadside Unit (TRU) is a bridge software component that connects multiple RSUs to the cloud infrastructure, enabling data aggregation and centralized management.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip
              label={`Running: ${getStatusCount('running')}`}
              color="success"
              size="small"
            />
            <Chip
              label={`Error: ${getStatusCount('error')}`}
              color="error"
              size="small"
            />
          </Stack>
        </Box>
        <Tooltip title="Refresh">
          <IconButton sx={{ color: '#748c93' }} onClick={refresh}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filters */}
      <TRUFilters filters={filters} onFilterChange={updateFilters} />

      {/* Table */}
      <StatusTable
        data={filteredStatuses}
        columns={columns}
        loading={loading}
        emptyMessage="No TRUs found in the system."
      />
    </Box>
  );
};

export default TRUStatusTab;
