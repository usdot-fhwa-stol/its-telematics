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
 * Server Context
 *
 * Manages server configuration state for mobile app.
 */

import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useStorageString } from '../hooks/useStorage';
import { STORAGE_KEYS } from '../constants/serverConfig';

const ServerContext = React.createContext({
  isConfigured: false,
  isInitialized: false,
  webServerUri: null,
  grafanaUri: null,
  configureServer: (webServerUri, grafanaUri) => { },
  resetServerConfig: () => { },
});

export const ServerContextProvider = (props) => {
  const isMobile = Capacitor.isNativePlatform();

  const [serverConfigured, setServerConfigured, isConfiguredInitialized] =
    useStorageString(STORAGE_KEYS.SERVER_CONFIG, null);
  const [webServerUri, setWebServerUri, isUriInitialized] =
    useStorageString(STORAGE_KEYS.WEB_SERVER_URI, null);
  const [grafanaUri, setGrafanaUri, isGrafanaInitialized] =
    useStorageString(STORAGE_KEYS.GRAFANA_URI, null);

  const isInitialized = isConfiguredInitialized && isUriInitialized && isGrafanaInitialized;

  // On web, always consider configured (uses env.js defaults)
  // On mobile, check if user has configured a server
  const isConfigured = !isMobile || (serverConfigured !== null && serverConfigured !== '');

  useEffect(() => {
    if (isMobile && isInitialized && webServerUri && grafanaUri) {
      window.env.REACT_APP_WEB_SERVER_URI = webServerUri;
      window.env.REACT_APP_GRAFANA_URI = grafanaUri;
    }
  }, [isMobile, isInitialized, webServerUri, grafanaUri]);

  const configureServerHandler = async (newWebServerUri, newGrafanaUri) => {
    await setServerConfigured('configured');
    await setWebServerUri(newWebServerUri);
    await setGrafanaUri(newGrafanaUri);

    window.env.REACT_APP_WEB_SERVER_URI = newWebServerUri;
    window.env.REACT_APP_GRAFANA_URI = newGrafanaUri;
  };

  const resetServerConfigHandler = async () => {
    await setServerConfigured(null);
    await setWebServerUri(null);
    await setGrafanaUri(null);
  };

  return (
    <ServerContext.Provider value={{
      isConfigured,
      isInitialized,
      webServerUri,
      grafanaUri,
      configureServer: configureServerHandler,
      resetServerConfig: resetServerConfigHandler,
    }}>
      {props.children}
    </ServerContext.Provider>
  );
};

export default ServerContext;
