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
import Button from '../../layout/Button';
import StatusTable from '../common/StatusTable';
import useHardwareStatus from '../hooks/useHardwareStatus';
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
    filteredList,
    loading,
    filters,
    updateFilters,
    getOnlineCount,
    getOfflineCount,
    refresh,
  } = useHardwareStatus('rsu');

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
      flex: 1,
    },
    {
      field: 'port',
      headerName: 'Port',
      flex: 0.5,
    },
    {
      field: 'online',
      headerName: 'Status',
      flex: 0.7,
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
      flex: 0.8,
      align: 'center',
      render: (row) => (
        <Stack direction="row" spacing={1} justifyContent="center">
          <Tooltip title="Edit">
            <IconButton
              size="small"
              color="primary"
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            RSU Status Management
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
        <Stack direction="row" spacing={2}>
          <Tooltip title="Refresh">
            <IconButton color="primary" onClick={refresh}>
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
      <RSUFilters filters={filters} onFilterChange={updateFilters} />

      {/* Table */}
      <StatusTable
        data={filteredList}
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
