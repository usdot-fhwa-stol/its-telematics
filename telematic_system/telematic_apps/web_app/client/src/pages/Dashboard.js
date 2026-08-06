/*
 * Copyright (C) 2019-2024 LEIDOS.
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
import { CircularProgress, Grid, Alert, Button } from '@mui/material';
import DensityMediumIcon from '@mui/icons-material/DensityMedium';
import { Box } from '@mui/system';
import React, { useContext, useEffect, useState } from 'react';
import Iframe from 'react-iframe';
import { useSearchParams } from 'react-router-dom';
import AuthContext from '../context/auth-context';
import { env } from '../env';
import { Capacitor } from '@capacitor/core';
import { InAppBrowser } from '@capacitor/inappbrowser';
import { deleteUser } from '../api/api-user';

const Dashboard = React.memo(() => {
  const [embedURL, setEmbedURL] = useState(env.REACT_APP_GRAFANA_URI + "/dashboards?theme=light")
  const [loading, setLoading] = useState(true);
  const authContext = useContext(AuthContext);

  const isMobile = Capacitor.isNativePlatform();

  // Mobile state
  const [mobileError, setMobileError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(isMobile);
  const [browserClosed, setBrowserClosed] = useState(false);

  const loadedHanlder = () => {
    setLoading(false);
  }

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("uid") !== null && searchParams.get("slug") !== null) {
      setEmbedURL(env.REACT_APP_GRAFANA_URI + '/d/' + searchParams.get("uid") + '/' + searchParams.get("slug") + "?=orgId=" + authContext.org_id + "&theme=light")
    }
  }, [])

  // Get Grafana auth token using app session (SSO)
  const authenticateWithSession = async () => {
    const response = await fetch(`${env.REACT_APP_WEB_SERVER_URI}/api/grafana-auth/session`, {
      method: 'GET',
      headers: {
        'Authorization': authContext.sessionToken,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Authentication failed');
    }

    return response.json();
  };

  // Open Grafana with token in URL
  const openGrafanaInAppBrowser = async (authToken) => {
    // Append token to URL
    const separator = embedURL.includes('?') ? '&' : '?';
    const authenticatedUrl = `${embedURL}${separator}grafana_auth=${encodeURIComponent(authToken)}`;

    await InAppBrowser.openInWebView({
      url: authenticatedUrl,
      options: {
        showURL: false,
        showToolbar: true,
        closeButtonText: 'Close',
        toolbarPosition: 'top',
        showNavigationButtons: true,
        leftToRight: false,
        android: {
          showTitle: true,
          hideToolbarOnScroll: false,
          viewStyle: 'bottomSheet',
          startAnimation: 'slideUp',
          exitAnimation: 'slideDown'
        }
      }
    });
  };

  // Open Grafana with authentication
  const openGrafana = async () => {
    try {
      setIsAuthenticating(true);
      setMobileError('');

      // Get Grafana token using app session (SSO)
      const authResult = await authenticateWithSession();

      // Open Grafana with token
      await openGrafanaInAppBrowser(authResult.token);

      setBrowserClosed(true);
    } catch (error) {
      console.error('Grafana error:', error);
      setMobileError(error.message || 'Failed to open Grafana. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Mobile: Auto-authenticate and open Grafana on mount
  useEffect(() => {
    if (!isMobile) return;
    openGrafana();
  }, [isMobile]);

  // Mobile: Retry opening Grafana
  const handleRetry = () => {
    setBrowserClosed(false);
    openGrafana();
  };

  const handleLogout = () => {
    deleteUser(authContext.username).then(() => {
      authContext.logout();
    }).catch(error => {
      console.log("error logout: " + error);
      authContext.logout();
    });
  };

  // Mobile: Show loading while authenticating
  if (isMobile && isAuthenticating) {
    return (
      <Box sx={{ display: 'flex', width: '100%', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Mobile: Show error if authentication failed
  if (isMobile && mobileError) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh', alignItems: 'center', justifyContent: 'center', p: 3, gap: 2 }}>
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          {mobileError}
        </Alert>
        <Button variant="contained" onClick={handleRetry}>
          Retry
        </Button>
        <Button variant="outlined" onClick={handleLogout}>
          Logout
        </Button>
      </Box>
    );
  }

  // Mobile: After InAppBrowser closes, show button to reopen
  if (isMobile && browserClosed) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <Button variant="contained" onClick={handleRetry} startIcon={<DensityMediumIcon />}>
          Browse Dashboards
        </Button>
        <Button variant="outlined" onClick={handleLogout}>
          Logout
        </Button>
      </Box>
    );
  }

  // Web: Show iframe
  return (
    <React.Fragment>
      {loading && <Box sx={{ display: 'flex', width: '100%', height: '100vh' }}>
        <CircularProgress sx={{ margin: 'auto' }} />
      </Box>
      }
      <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }} sx={{ height: '100vh' }}>
        <Iframe url={embedURL}
          onLoad={loadedHanlder}
          id="dashboard_iframe"
          position="absolute"
          width="100%"
          height="100%"
          frameBorder="0"
          allowFullScreen />
      </Grid>

    </React.Fragment>
  )
});

export default Dashboard