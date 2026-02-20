/*
 * Copyright (C) 2019-2026 LEIDOS.
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
 *
 * Server Configuration Page
 *
 * Allows mobile users to configure server connection settings.
 * Shown at app startup before login.
 */

import React, { useContext, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Collapse,
  Container,
  FormControlLabel,
  Snackbar,
  TextField,
  Typography
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import StorageIcon from '@mui/icons-material/Storage';
import ServerContext from '../context/server-context';
import { getMobileWrapperStyles, getMobileContainerStyles, getMobileBoxStyles } from '../utils/mobileStyles';

const theme = createTheme();

const ServerConfigPage = React.memo(() => {
  const serverContext = useContext(ServerContext);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);

  const [serverUrl, setServerUrl] = useState('');
  const [serverPort, setServerPort] = useState('');
  const [useCustomPort, setUseCustomPort] = useState(false);
  const [customGrafanaUri, setCustomGrafanaUri] = useState('');
  const [useCustomGrafana, setUseCustomGrafana] = useState(false);

  const testConnection = async (fullServerUrl) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${fullServerUrl}/api/org/all`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 401; // 401 means server is reachable
    } catch (err) {
      return false;
    }
  };

  const buildServerUri = () => {
    const url = serverUrl.trim();
    const port = useCustomPort ? serverPort.trim() : '';
    if (!url) return '';
    if (!port) return url;
    return `${url}:${port}`;
  };

  const handleConfirm = async () => {
    setTesting(true);
    setError('');

    if (!serverUrl.trim()) {
      setError('Please enter a server URL.');
      setShowError(true);
      setTesting(false);
      return;
    }

    const webServerUri = buildServerUri();
    const grafanaUri = useCustomGrafana && customGrafanaUri.trim()
      ? customGrafanaUri.trim()
      : `${webServerUri}/grafana`;

    const isConnected = await testConnection(webServerUri);

    if (!isConnected) {
      setError('Cannot connect to server. Please check your network connection and server URL.');
      setShowError(true);
      setTesting(false);
      return;
    }

    // Save configuration
    await serverContext.configureServer(webServerUri, grafanaUri);
    setTesting(false);
  };

  const handleCloseError = () => {
    setShowError(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        open={showError}
        onClose={handleCloseError}
        autoHideDuration={6000}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Box sx={getMobileWrapperStyles(true)}>
        <Container maxWidth="xs" sx={getMobileContainerStyles(true)}>
          <Box sx={getMobileBoxStyles(true)}>
            <StorageIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" component="h1" gutterBottom>
              Server Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              Enter your server connection details
            </Typography>

            {/* Server URL field */}
            <TextField
              fullWidth
              size="small"
              label="Server URL"
              placeholder="https://example.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              sx={{ mb: 2 }}
            />

            {/* Custom Port option */}
            <Box sx={{ width: '100%', mb: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={useCustomPort}
                    onChange={(e) => setUseCustomPort(e.target.checked)}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Use custom port</Typography>}
              />
              <Collapse in={useCustomPort}>
                <TextField
                  fullWidth
                  size="small"
                  label="Port"
                  placeholder="8080"
                  value={serverPort}
                  onChange={(e) => setServerPort(e.target.value)}
                  sx={{ mt: 1 }}
                />
              </Collapse>
            </Box>

            {/* Custom Grafana URL option */}
            <Box sx={{ width: '100%' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={useCustomGrafana}
                    onChange={(e) => setUseCustomGrafana(e.target.checked)}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Use different Grafana URL</Typography>}
              />
              <Collapse in={useCustomGrafana}>
                <TextField
                  fullWidth
                  size="small"
                  label="Grafana URL"
                  placeholder="http://###.###.###.###"
                  value={customGrafanaUri}
                  onChange={(e) => setCustomGrafanaUri(e.target.value)}
                  sx={{ mt: 1 }}
                />
              </Collapse>
            </Box>

            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleConfirm}
              disabled={testing}
              sx={{ mt: 3 }}
            >
              {testing ? <CircularProgress size={24} color="inherit" /> : 'Connect'}
            </Button>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
});

export default ServerConfigPage;
