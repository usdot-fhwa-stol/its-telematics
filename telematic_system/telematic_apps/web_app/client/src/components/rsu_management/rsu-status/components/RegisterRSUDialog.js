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

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Alert, FormControl, Grid, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTRUConfig } from '../../../../context/tru-config-context';
import { useTRUStatus } from '../../../../context/tru-status-context';
import Button from '../../../layout/Button';
import ManagementDialog from '../../common/ManagementDialog';

/**
 * Register RSU Dialog Component
 * Allows users to register a new RSU
 */
const RegisterRSUDialog = ({ open, onClose, onSuccess }) => {
  const { registerRSU, buildTruConfigMessage } = useTRUConfig();
  const { refresh: refreshStatus, truStatuses } = useTRUStatus();
  const [formData, setFormData] = useState({
    unitId: '',
    ip: '',
    port: '',
    event: '',
    snmp: {
      privacyProtocol: '',
      securityLevel: '',
      authProtocol: '',
      authPassPhrase: '',
      user: '',
      privacyPassPhrase: '',
      rsuMibVersion: 'NTCIP1218'
    }
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Automatically select the best TRU when dialog opens
  useEffect(() => {
    if (open && Array.isArray(truStatuses) && truStatuses.length > 0 && !formData.unitId) {
      // Find TRU with available capacity
      const truWithCapacity = truStatuses
        .map(tru => {
          const currentConnections = tru.rsuConfigs?.length || 0;
          const maxConnections = tru.unitConfig?.maxConnections || 0;
          const availableCapacity = maxConnections - currentConnections;
          const bridgeStatus = tru.pluginConfigStatus?.bridgePluginStatus?.toLowerCase() || 'pending';
          
          return {
            unitId: tru.unitConfig?.unitId,
            name: tru.unitConfig?.name,
            bridgePluginStatus: bridgeStatus,
            availableCapacity,
            currentConnections,
            maxConnections
          };
        })
        // Filter: only running TRUs with available capacity
        .filter(tru => 
          tru.bridgePluginStatus === 'running' && 
          tru.availableCapacity > 0
        )
        // Sort by most available capacity first
        .sort((a, b) => b.availableCapacity - a.availableCapacity);

      // Select the TRU with the most available capacity
      if (truWithCapacity.length > 0) {
        setFormData(prev => ({
          ...prev,
          unitId: truWithCapacity[0].unitId
        }));
      }
    }
  }, [open, truStatuses, formData.unitId]);

  const handleChange = (field, value) => {
    if (field.startsWith('snmp.')) {
      const snmpField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        snmp: { ...prev.snmp, [snmpField]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    setError(null);
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.unitId) {
      setError('TRU selection is required');
      return;
    }

    if (!formData.ip || !formData.port) {
      setError('IP address and port are required');
      return;
    }

    // Validate IP address format (IPv4)
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipv4Regex.test(formData.ip)) {
      setError('IP address must be a valid IPv4 address (e.g., 192.168.1.100)');
      return;
    }

    const portNum = parseInt(formData.port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setError('Port must be a valid number between 1 and 65535');
      return;
    }

    if (!formData.event) {
      setError('Event name is required');
      return;
    }

    // Validate SNMP configuration
    if (!formData.snmp.user) {
      setError('SNMP User is required');
      return;
    }

    if (!formData.snmp.securityLevel) {
      setError('SNMP Security Level is required');
      return;
    }

    if (!formData.snmp.authProtocol) {
      setError('SNMP Auth Protocol is required');
      return;
    }

    if (!formData.snmp.authPassPhrase) {
      setError('SNMP Auth Pass Phrase is required');
      return;
    }

    if (!formData.snmp.privacyProtocol) {
      setError('SNMP Privacy Protocol is required');
      return;
    }

    if (!formData.snmp.privacyPassPhrase) {
      setError('SNMP Privacy Pass Phrase is required');
      return;
    }

    if (!formData.snmp.rsuMibVersion) {
      setError('RSU MIB Version is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the context builder to construct TruConfigMessage
      const truConfigMessage = buildTruConfigMessage(
        formData.unitId,
        'add',
        formData.event,
        {
          ip: formData.ip,
          port: portNum
        },
        formData.snmp
      );

      await registerRSU(truConfigMessage);
      await refreshStatus(); // Refresh status after config change
      
      // Reset form and close
      setFormData({ 
        unitId: '', 
        ip: '', 
        port: '', 
        event: '',
        snmp: {
          privacyProtocol: '',
          securityLevel: '',
          authProtocol: '',
          authPassPhrase: '',
          user: '',
          privacyPassPhrase: '',
          rsuMibVersion: 'NTCIP1218'
        }
      });
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to register RSU');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ 
      unitId: '', 
      ip: '', 
      port: '', 
      event: '',
      snmp: {
        privacyProtocol: '',
        securityLevel: '',
        authProtocol: '',
        authPassPhrase: '',
        user: '',
        privacyPassPhrase: '',
        rsuMibVersion: 'NTCIP1218'
      }
    });
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
          <FormControl fullWidth required disabled={loading}>
            <InputLabel>Select TRU</InputLabel>
            <Select
              value={formData.unitId}
              label="Select TRU"
              onChange={(e) => handleChange('unitId', e.target.value)}
            >
              {Array.isArray(truStatuses) && truStatuses.map((tru) => {
                const currentConnections = tru.rsuConfigs?.length || 0;
                const maxConnections = tru.unitConfig?.maxConnections || 0;
                const availableCapacity = maxConnections - currentConnections;
                const isRunning = tru?.pluginConfigStatus?.bridgePluginStatus.toLowerCase() === 'running';                
                return (
                  <MenuItem 
                    key={tru.unitConfig?.unitId} 
                    value={tru.unitConfig?.unitId}
                    disabled={!isRunning || availableCapacity <= 0}
                  >
                    { tru.unitConfig?.unitId } - {tru.unitConfig?.name} 
                    {' '}({currentConnections}/{maxConnections} RSUs)
                    {!isRunning && ' - Not Running'}
                    {isRunning && availableCapacity <= 0 && ' - Full'}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Grid>
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
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Event Name"
            placeholder="e.g., register"
            value={formData.event}
            onChange={(e) => handleChange('event', e.target.value)}
            required
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>SNMP Configuration</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="User"
                    value={formData.snmp.user}
                    onChange={(e) => handleChange('snmp.user', e.target.value)}
                    disabled={loading}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={loading} required>
                    <InputLabel>Security Level</InputLabel>
                    <Select
                      value={formData.snmp.securityLevel}
                      label="Security Level"
                      onChange={(e) => handleChange('snmp.securityLevel', e.target.value)}
                    >
                      <MenuItem value="noAuthNoPriv">No Auth No Priv</MenuItem>
                      <MenuItem value="authNoPriv">Auth No Priv</MenuItem>
                      <MenuItem value="authPriv">Auth Priv</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={loading} required>
                    <InputLabel>Auth Protocol</InputLabel>
                    <Select
                      value={formData.snmp.authProtocol}
                      label="Auth Protocol"
                      onChange={(e) => handleChange('snmp.authProtocol', e.target.value)}
                    >
                      <MenuItem value="MD5">MD5</MenuItem>
                      <MenuItem value="SHA">SHA</MenuItem>
                      <MenuItem value="SHA-224">SHA-224</MenuItem>
                      <MenuItem value="SHA-256">SHA-256</MenuItem>
                      <MenuItem value="SHA-384">SHA-384</MenuItem>
                      <MenuItem value="SHA-512">SHA-512</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Auth Pass Phrase"
                    type="password"
                    value={formData.snmp.authPassPhrase}
                    onChange={(e) => handleChange('snmp.authPassPhrase', e.target.value)}
                    disabled={loading}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={loading} required>
                    <InputLabel>Privacy Protocol</InputLabel>
                    <Select
                      value={formData.snmp.privacyProtocol}
                      label="Privacy Protocol"
                      onChange={(e) => handleChange('snmp.privacyProtocol', e.target.value)}
                    >
                      <MenuItem value="DES">DES</MenuItem>
                      <MenuItem value="AES">AES</MenuItem>
                      <MenuItem value="AES-128">AES-128</MenuItem>
                      <MenuItem value="AES-192">AES-192</MenuItem>
                      <MenuItem value="AES-256">AES-256</MenuItem>
                      <MenuItem value="AES-192-Cisco">AES-192-Cisco</MenuItem>
                      <MenuItem value="AES-256-Cisco">AES-256-Cisco</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Privacy Pass Phrase"
                    type="password"
                    value={formData.snmp.privacyPassPhrase}
                    onChange={(e) => handleChange('snmp.privacyPassPhrase', e.target.value)}
                    disabled={loading}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth disabled={loading} required>
                    <InputLabel>RSU MIB Version</InputLabel>
                    <Select
                      value={formData.snmp.rsuMibVersion}
                      label="RSU MIB Version"
                      onChange={(e) => handleChange('snmp.rsuMibVersion', e.target.value)}
                    >
                      <MenuItem value="NTCIP1218">NTCIP1218</MenuItem>
                      <MenuItem value="RSU4.1">RSU4.1</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </ManagementDialog>
  );
};

export default RegisterRSUDialog;
