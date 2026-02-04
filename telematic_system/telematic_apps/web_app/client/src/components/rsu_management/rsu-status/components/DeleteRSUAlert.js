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

import WarningIcon from '@mui/icons-material/Warning';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import rsuService from '../../../../api/rsuService';
import Button from '../../../layout/Button';

/**
 * Delete RSU Alert Component
 * Confirmation dialog for deleting an RSU
 */
const DeleteRSUAlert = ({ open, onClose, rsu, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    if (!rsu) return;

    setLoading(true);
    setError(null);

    try {
      await rsuService.deleteRSU(rsu.ip, rsu.port);
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete RSU');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        Confirm Delete RSU
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Typography variant="body1" gutterBottom>
          Are you sure you want to delete this RSU?
        </Typography>
        
        {rsu && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            <strong>IP:</strong> {rsu.ip}
            <br />
            <strong>Port:</strong> {rsu.port}
          </Typography>
        )}
        
        <Alert severity="warning" sx={{ mt: 2 }}>
          This action cannot be undone. The RSU will be permanently removed from the system.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button color="error" onClick={handleDelete} disabled={loading}>
          {loading ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteRSUAlert;
