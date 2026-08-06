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

import { createContext, useCallback, useContext, useState } from 'react';
import rsuService from '../api/api-rsu';

const TRUConfigContext = createContext();
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
   * Build a TruConfigMessage for API requests
   * @param {string} unitId - The TRU unit ID
   * @param {string} action - The action: 'add', 'update', or 'remove'
   * @param {string} event - The event name
   * @param {object} rsu - RSU endpoint {ip, port}
   * @param {object} snmp - SNMP configuration (optional for remove action)
   * @returns {object} TruConfigMessage
   */
  const buildTruConfigMessage = useCallback((unitId, action, event, rsu, snmp = null) => {
    const rsuConfigItem = {
      action,
      event,
      rsu: {
        ip: rsu.ip,
        port: rsu.port
      }
    };

    // Add SNMP config if provided (not needed for remove action)
    if (snmp) {
      rsuConfigItem.snmp = snmp;
    }

    return {
      unitConfig: {
        unitId
      },
      rsuConfigs: [rsuConfigItem],
      timestamp: Date.now()
    };
  }, []);

  /**
   * Register a new RSU
   * @param {object} rsuData - RSU data {unitId, action, event, rsu: {ip, port}, snmp}
   */
  const registerRSU = useCallback(async (rsuData) => {
    setLoading(true);
    setError(null);
    try {
      // Use the builder if rsuData doesn't have the full TruConfigMessage structure
      let truConfigMessage;
      if (rsuData.unitConfig && rsuData.rsuConfigs) {
        // Already a complete TruConfigMessage
        truConfigMessage = rsuData;
      } else {
        // Build from individual fields
        truConfigMessage = buildTruConfigMessage(
          rsuData.unitId,
          rsuData.action || 'add',
          rsuData.event,
          rsuData.rsu,
          rsuData.snmp
        );
      }
      
      const result = await rsuService.assignRSU(truConfigMessage);
      return { success: true, message: 'RSU registered successfully', data: result };
    } catch (err) {
      setError(err.message || 'Failed to register RSU');
      console.error('Error registering RSU:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [buildTruConfigMessage]);

  /**
   * Update an existing RSU
   * @param {object} rsuData - RSU data {unitId, action, event, rsu: {ip, port}, snmp}
   */
  const updateRSU = useCallback(async (rsuData) => {
    setLoading(true);
    setError(null);
    try {
      // Use the builder if rsuData doesn't have the full TruConfigMessage structure
      let truConfigMessage;
      if (rsuData.unitConfig && rsuData.rsuConfigs) {
        // Already a complete TruConfigMessage
        truConfigMessage = rsuData;
      } else {
        // Build from individual fields
        truConfigMessage = buildTruConfigMessage(
          rsuData.unitId,
          rsuData.action || 'update',
          rsuData.event,
          rsuData.rsu,
          rsuData.snmp
        );
      }
      
      const result = await rsuService.updateRSUConfig(truConfigMessage);
      return { success: true, message: 'RSU configuration updated successfully', data: result };
    } catch (err) {
      setError(err.message || 'Failed to update RSU configuration');
      console.error('Error updating RSU:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [buildTruConfigMessage]);

  /**
   * Delete an RSU
   * @param {string} ip - RSU IP address
   * @param {number} port - RSU port
   * @param {string} unitId - TRU unit ID
   */
  const deleteRSU = useCallback(async (ip, port, unitId, event) => {
    setLoading(true);
    setError(null);
    try {
      // Use the builder to construct message
      const truConfigMessage = buildTruConfigMessage(
        unitId,
        'remove',
        event,
        { ip, port },
        null // No SNMP config needed for delete
      );
      
      const result = await rsuService.removeRSU(truConfigMessage);
      return { success: true, message: 'RSU deleted successfully', data: result };
    } catch (err) {
      setError(err.message || 'Failed to delete RSU');
      console.error('Error deleting RSU:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [buildTruConfigMessage]);

  const value = {
    truConfigs,
    loading,
    error,
    lastUpdated,
    buildTruConfigMessage,
    registerRSU,
    updateRSU,
    deleteRSU,
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
