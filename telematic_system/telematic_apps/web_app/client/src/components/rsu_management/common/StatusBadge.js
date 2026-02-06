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

import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { Chip } from '@mui/material';

/**
 * Status Badge Component
 * Displays RSU status with color coding
 * Supports: other, standby, operate, fault (or legacy online/offline boolean)
 */
const StatusBadge = ({ online, status, size = 'small' }) => {
  // Handle new status field (other, standby, operate, fault)
  let statusLabel;
  let statusColor;

  if (status) {
    // New status values
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'operate':
      case 'operation':
        statusLabel = 'Operate';
        statusColor = 'success';
        break;
      case 'standby':
        statusLabel = 'Standby';
        statusColor = 'warning';
        break;
      case 'fault':
        statusLabel = 'Fault';
        statusColor = 'error';
        break;
      case 'other':
        statusLabel = 'Other';
        statusColor = 'default';
        break;
      default:
        statusLabel = 'Pending';
        statusColor = 'secondary';
        break;
    }
  } else {
    // Legacy online/offline boolean support
    statusLabel = online ? 'Online' : 'Offline';
    statusColor = online ? 'success' : 'error';
  }

  return (
    <Chip
      icon={<FiberManualRecordIcon />}
      label={statusLabel}
      color={statusColor}
      size={size}
      sx={{
        fontWeight: 'bold',
        '& .MuiChip-icon': {
          fontSize: size === 'small' ? '12px' : '16px',
        },
      }}
    />
  );
};

export default StatusBadge;
