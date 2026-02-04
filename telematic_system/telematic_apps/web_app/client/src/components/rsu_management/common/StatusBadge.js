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
 * Displays online/offline status with color coding
 */
const StatusBadge = ({ online, size = 'small' }) => {
  return (
    <Chip
      icon={<FiberManualRecordIcon />}
      label={online ? 'Online' : 'Offline'}
      color={online ? 'success' : 'error'}
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
