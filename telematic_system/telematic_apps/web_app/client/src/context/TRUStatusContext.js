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

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import rsuService from '../api/rsuService';

const TRUStatusContext = createContext();

// Dummy data for local testing - TruConfigStatus
const DUMMY_TRU_STATUSES = [
  {
    unitConfig: {
      unitId: 'unit_12345',
      bridgePluginStatus: 'Running',
      lastUpdatedTimestamp: Date.now() - 30000,
      timestamp: Date.now() - 30000
    },
    rsuConfigs: [
      {
        rsu: { ip: '192.168.1.100', port: 1516 },
        Status: 'operation',
        event: 'RSU_ADDED'
      },
      {
        rsu: { ip: '192.168.1.101', port: 1516 },
        Status: 'operation',
        event: 'RSU_ADDED'
      }
    ],
    timestamp: (Date.now() - 30000).toString()
  },
  {
    unitConfig: {
      unitId: 'unit_67890',
      bridgePluginStatus: 'Running',
      lastUpdatedTimestamp: Date.now() - 45000,
      timestamp: Date.now() - 45000
    },
    rsuConfigs: [
      {
        rsu: { ip: '192.168.2.100', port: 1516 },
        Status: 'operation',
        event: 'RSU_UPDATED'
      },
      {
        rsu: { ip: '192.168.2.101', port: 1516 },
        Status: 'fault',
        event: 'RSU_CONNECTION_LOST'
      },
      {
        rsu: { ip: '192.168.2.102', port: 1516 },
        Status: 'operation',
        event: 'RSU_ADDED'
      }
    ],
    timestamp: (Date.now() - 45000).toString()
  },
  {
    unitConfig: {
      unitId: 'unit_99999',
      bridgePluginStatus: 'Stopped',
      lastUpdatedTimestamp: Date.now() - 300000,
      timestamp: Date.now() - 300000
    },
    rsuConfigs: [
      {
        rsu: { ip: '192.168.3.100', port: 1516 },
        Status: 'fault',
        event: 'RSU_OFFLINE'
      }
    ],
    timestamp: (Date.now() - 300000).toString()
  }
];

/**
 * Context provider for TRU Status management
 * Manages TRU status information following TruConfigStatus model
 */
export const TRUStatusProvider = ({ children }) => {
  const [truStatuses, setTruStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  /**
   * Fetch all TRU statuses
   */
  const fetchTRUStatuses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use dummy data for local testing
      // Uncomment below to use real API:
      // const statuses = await rsuService.getTRUStatuses();
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      const statuses = DUMMY_TRU_STATUSES;
      setTruStatuses(statuses);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Failed to fetch TRU statuses');
      console.error('Error fetching TRU statuses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch TRU status by unit ID
   */
  const fetchTRUStatusById = useCallback(async (unitId) => {
    setLoading(true);
    setError(null);
    try {
      // Use dummy data for local testing
      // Uncomment below to use real API:
      // const status = await rsuService.getTRUStatusById(unitId);
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
      const status = DUMMY_TRU_STATUSES.find(s => s.unitConfig.unitId === unitId);
      return status;
    } catch (err) {
      setError(err.message || `Failed to fetch TRU status for ${unitId}`);
      console.error(`Error fetching TRU status for ${unitId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get online TRUs (based on plugin status)
   */
  const getOnlineTRUs = useCallback(() => {
    return truStatuses.filter(status => 
      status.unitConfig?.bridgePluginStatus === 'Running'
    );
  }, [truStatuses]);

  /**
   * Get offline TRUs (based on plugin status)
   */
  const getOfflineTRUs = useCallback(() => {
    return truStatuses.filter(status => 
      status.unitConfig?.bridgePluginStatus !== 'Running'
    );
  }, [truStatuses]);

  /**
   * Filter TRUs by plugin status
   */
  const filterByStatus = useCallback((isActive) => {
    const statusFilter = isActive ? 'Running' : 'Stopped';
    return truStatuses.filter(status => 
      status.unitConfig?.bridgePluginStatus === statusFilter
    );
  }, [truStatuses]);

  /**
   * Get RSU count for a TRU
   */
  const getRSUCount = useCallback((unitId) => {
    const status = truStatuses.find(s => s.unitConfig.unitId === unitId);
    return status?.rsuConfigs?.length || 0;
  }, [truStatuses]);

  /**
   * Get online RSU count for a TRU
   */
  const getOnlineRSUCount = useCallback((unitId) => {
    const status = truStatuses.find(s => s.unitConfig.unitId === unitId);
    return status?.rsuConfigs?.filter(rsu => rsu.Status === 'operation').length || 0;
  }, [truStatuses]);

  /**
   * Refresh TRU statuses
   */
  const refresh = useCallback(async () => {
    await fetchTRUStatuses();
  }, [fetchTRUStatuses]);

  // Initial data fetch
  useEffect(() => {
    fetchTRUStatuses();
  }, [fetchTRUStatuses]);

  const value = {
    truStatuses,
    loading,
    error,
    lastUpdated,
    fetchTRUStatuses,
    fetchTRUStatusById,
    getOnlineTRUs,
    getOfflineTRUs,
    filterByStatus,
    getRSUCount,
    getOnlineRSUCount,
    refresh,
  };

  return <TRUStatusContext.Provider value={value}>{children}</TRUStatusContext.Provider>;
};

/**
 * Custom hook to use TRU Status context
 */
export const useTRUStatus = () => {
  const context = useContext(TRUStatusContext);
  if (!context) {
    throw new Error('useTRUStatus must be used within a TRUStatusProvider');
  }
  return context;
};

export default TRUStatusContext;
