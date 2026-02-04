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

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const TRUConfigContext = createContext();

// Dummy data for local testing - TruConfigMessage
const DUMMY_TRU_CONFIGS = [
  {
    unitConfig: {
      unitId: 'Unit001'
    },
    rsuConfigs: [
      {
        action: 'add',
        event: 'new test event 1',
        rsu: { ip: '192.168.1.100', port: 1516 },
        snmp: {
          privacyProtocol: 'TLS',
          securityLevel: 'high',
          authProtocol: 'SHA256',
          authPassPhrase: 'auth1234',
          user: 'rsuuser',
          privacyPassPhrase: 'privacy1234',
          rsuMibVersion: 'v1.0'
        }
      },
      {
        action: 'add',
        event: 'new test event 2',
        rsu: { ip: '192.168.1.101', port: 1516 },
        snmp: {
          privacyProtocol: 'TLS',
          securityLevel: 'high',
          authProtocol: 'SHA256',
          authPassPhrase: 'auth1234',
          user: 'rsuuser',
          privacyPassPhrase: 'privacy1234',
          rsuMibVersion: 'v1.0'
        }
      }
    ],
    timestamp: Date.now()
  },
  {
    unitConfig: {
      unitId: 'Unit002'
    },
    rsuConfigs: [
      {
        action: 'add',
        event: 'new test event 3',
        rsu: { ip: '192.168.1.11', port: 502 },
        snmp: {
          privacyProtocol: 'TLS',
          securityLevel: 'high',
          authProtocol: 'SHA256',
          authPassPhrase: 'auth1234',
          user: 'rsuuser',
          privacyPassPhrase: 'privacy1234',
          rsuMibVersion: 'v1.0'
        }
      },
      {
        action: 'update',
        event: 'configuration update',
        rsu: { ip: '192.168.2.100', port: 1516 },
        snmp: {
          privacyProtocol: 'AES',
          securityLevel: 'medium',
          authProtocol: 'MD5',
          authPassPhrase: 'auth5678',
          user: 'adminuser',
          privacyPassPhrase: 'privacy5678',
          rsuMibVersion: 'v2.0'
        }
      }
    ],
    timestamp: Date.now()
  },
  {
    unitConfig: {
      unitId: 'Unit003'
    },
    rsuConfigs: [
      {
        action: 'remove',
        event: 'decommission RSU',
        rsu: { ip: '192.168.3.100', port: 1516 }
      }
    ],
    timestamp: Date.now()
  }
];

/**
 * Context provider for TRU Configuration management
 * Manages TRU configurations and provides CRUD operations
 */
export const TRUConfigProvider = ({ children }) => {
  const [truConfigs, setTruConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  /**
   * Fetch all TRU configurations
   */
  const fetchTRUConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use dummy data for local testing
      // Uncomment below to use real API:
      // const configs = await rsuService.getTRUConfigs();
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      const configs = DUMMY_TRU_CONFIGS;
      setTruConfigs(configs);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Failed to fetch TRU configurations');
      console.error('Error fetching TRU configs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch TRU config by unit ID
   */
  const fetchTRUConfigById = useCallback(async (unitId) => {
    setLoading(true);
    setError(null);
    try {
      // Use dummy data for local testing
      // Uncomment below to use real API:
      // const config = await rsuService.getTRUConfigById(unitId);
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
      const config = DUMMY_TRU_CONFIGS.find(c => c.unitConfig.unitId === unitId);
      return config;
    } catch (err) {
      setError(err.message || `Failed to fetch TRU config for ${unitId}`);
      console.error(`Error fetching TRU config for ${unitId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update TRU configuration
   */
  const updateTRUConfig = useCallback(async (unitId, configData) => {
    setLoading(true);
    setError(null);
    try {
      // Use dummy data for local testing
      // Uncomment below to use real API:
      // const result = await rsuService.updateTRUConfig(unitId, configData);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      
      // Update local dummy data
      const updatedConfigs = truConfigs.map(config =>
        config.unitConfig.unitId === unitId ? { ...config, ...configData } : config
      );
      setTruConfigs(updatedConfigs);
      
      return { success: true };
    } catch (err) {
      setError(err.message || `Failed to update TRU config for ${unitId}`);
      console.error(`Error updating TRU config for ${unitId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [truConfigs]);

  /**
   * Refresh TRU configurations
   */
  const refresh = useCallback(async () => {
    await fetchTRUConfigs();
  }, [fetchTRUConfigs]);

  // Initial data fetch
  useEffect(() => {
    fetchTRUConfigs();
  }, [fetchTRUConfigs]);

  const value = {
    truConfigs,
    loading,
    error,
    lastUpdated,
    fetchTRUConfigs,
    fetchTRUConfigById,
    updateTRUConfig,
    refresh,
  };

  return <TRUConfigContext.Provider value={value}>{children}</TRUConfigContext.Provider>;
};

/**
 * Custom hook to use TRU Config context
 */
export const useTRUConfig = () => {
  const context = useContext(TRUConfigContext);
  if (!context) {
    throw new Error('useTRUConfig must be used within a TRUConfigProvider');
  }
  return context;
};

export default TRUConfigContext;
