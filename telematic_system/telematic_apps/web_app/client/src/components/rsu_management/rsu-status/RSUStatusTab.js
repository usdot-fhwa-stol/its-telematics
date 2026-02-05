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

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useTRUStatus } from '../../../context/TRUStatusContext';
import Button from '../../layout/Button';
import StatusTable from '../common/StatusTable';
import DeleteRSUAlert from './components/DeleteRSUAlert';
import EditRSUDialog from './components/EditRSUDialog';
import RSUFilters from './components/RSUFilters';
import RegisterRSUDialog from './components/RegisterRSUDialog';

/**
 * RSU Status Tab Component
 * Main entry point for the RSU Status tab
 */
const RSUStatusTab = () => {
  const {
    filteredRSUStatuses,
    loading,
    rsuFilters,
    updateRSUFilters,
    getRSUStatusCount,
    refresh,
  } = useTRUStatus();

  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedRSU, setSelectedRSU] = useState(null);

  const handleRegister = () => {
    setRegisterDialogOpen(true);
  };

  const handleEdit = (rsu) => {
    setSelectedRSU(rsu);
    setEditDialogOpen(true);
  };

  const handleDelete = (rsu) => {
    setSelectedRSU(rsu);
    setDeleteAlertOpen(true);
  };

  const handleSuccess = () => {
    refresh();
  };

  const columns = [
    {
      field: 'ip',
      headerName: 'IP Address',
      flex: 0.9,
    },
    {
      field: 'port',
      headerName: 'Port',
      flex: 0.4,
    },
    {
      field: 'unitId',
      headerName: 'Associated TRU ID',
      flex: 0.9,
      render: (row) => row.unitId || '-',
    },
    {
      field: 'eventName',
      headerName: 'Event Name',
      flex: 1.2,
      render: (row) => row.event || '-',
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.6,
    },
    {
      field: 'lastSeen',
      headerName: 'Last Seen',
      type: 'timestamp',
      flex: 1,
      render: (row) => {
        if (!row.lastSeen) return '-';
        return new Date(row.lastSeen).toLocaleString();
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.7,
      align: 'center',
      render: (row) => (
        <Stack direction="row" spacing={1} justifyContent="center">
          <Tooltip title="Edit">
            <IconButton
              size="small"
              sx={{ color: '#748c93' }}
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(row);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5" gutterBottom>
            RSU Status Management
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            A Roadside Unit (RSU) is a field device that provides V2X (Vehicle-to-Everything) communication capabilities, broadcasting safety messages and collecting data from connected vehicles.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip
              label={`Operate: ${getRSUStatusCount('operate')}`}
              color="success"
              size="small"
            />
            <Chip
              label={`Standby: ${getRSUStatusCount('standby')}`}
              color="warning"
              size="small"
            />
            <Chip
              label={`Fault: ${getRSUStatusCount('fault')}`}
              color="error"
              size="small"
            />
            <Chip
              label={`Other: ${getRSUStatusCount('other')}`}
              color="default"
              size="small"
            />
          </Stack>
        </Box>
        <Stack direction="row" spacing={2}>
          <Tooltip title="Refresh">
            <IconButton sx={{ color: '#748c93' }} onClick={refresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            startIcon={<AddIcon />}
            onClick={handleRegister}
          >
            Register RSU
          </Button>
        </Stack>
      </Box>

      {/* Filters */}
      <RSUFilters filters={rsuFilters} onFilterChange={updateRSUFilters} />

      {/* Table */}
      <StatusTable
        data={filteredRSUStatuses}
        columns={columns}
        loading={loading}
        emptyMessage="No RSUs found. Click 'Register RSU' to add one."
      />

      {/* Dialogs */}
      <RegisterRSUDialog
        open={registerDialogOpen}
        onClose={() => setRegisterDialogOpen(false)}
        onSuccess={handleSuccess}
      />

      <EditRSUDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        rsu={selectedRSU}
        onSuccess={handleSuccess}
      />

      <DeleteRSUAlert
        open={deleteAlertOpen}
        onClose={() => setDeleteAlertOpen(false)}
        rsu={selectedRSU}
        onSuccess={handleSuccess}
      />
    </Box>
  );
};

export default RSUStatusTab;
