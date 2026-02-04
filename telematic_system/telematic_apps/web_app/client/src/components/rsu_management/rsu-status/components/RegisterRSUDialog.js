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

import React, { useState } from 'react';
import { TextField, Grid, Alert } from '@mui/material';
import ManagementDialog from '../../common/ManagementDialog';
import Button from '../../../layout/Button';
import rsuService from '../../../../api/rsuService';

/**
 * Register RSU Dialog Component
 * Allows users to register a new RSU
 */
const RegisterRSUDialog = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    ip: '',
    port: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.ip || !formData.port) {
      setError('IP address and port are required');
      return;
    }

    const portNum = parseInt(formData.port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setError('Port must be a valid number between 1 and 65535');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rsuData = {
        rsu: {
          ip: formData.ip,
          port: portNum,
        },
        action: 'add',
        event: 'register',
      };

      await rsuService.registerRSU(rsuData);
      
      // Reset form and close
      setFormData({ ip: '', port: '' });
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to register RSU');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ ip: '', port: '' });
    setError(null);
    onClose();
  };

  const actions = (
    <>
      <Button variant="outlined" onClick={handleClose} disabled={loading}>
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Registering...' : 'Register'}
      </Button>
    </>
  );

  return (
    <ManagementDialog
      open={open}
      onClose={handleClose}
      title="Register New RSU"
      actions={actions}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="IP Address"
            placeholder="e.g., 192.168.1.100"
            value={formData.ip}
            onChange={(e) => handleChange('ip', e.target.value)}
            required
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Port"
            type="number"
            placeholder="e.g., 1516"
            value={formData.port}
            onChange={(e) => handleChange('port', e.target.value)}
            required
            disabled={loading}
            inputProps={{ min: 1, max: 65535 }}
          />
        </Grid>
      </Grid>
    </ManagementDialog>
  );
};

export default RegisterRSUDialog;
