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

import { useState, useEffect, useCallback } from 'react';
import rsuService from '../../../api/rsuService';

// Dummy RSU status data for local testing
const DUMMY_RSU_STATUSES = [
  { ip: '192.168.1.100', port: 1516, online: true, lastSeen: Date.now() - 25000 },
  { ip: '192.168.1.101', port: 1516, online: true, lastSeen: Date.now() - 40000 },
  { ip: '192.168.2.100', port: 1516, online: true, lastSeen: Date.now() - 15000 },
  { ip: '192.168.2.101', port: 1516, online: false, lastSeen: Date.now() - 600000 },
  { ip: '192.168.2.102', port: 1516, online: true, lastSeen: Date.now() - 35000 },
  { ip: '192.168.3.100', port: 1516, online: false, lastSeen: Date.now() - 900000 },
  { ip: '192.168.4.100', port: 1516, online: true, lastSeen: Date.now() - 20000 },
  { ip: '192.168.4.101', port: 1516, online: false, lastSeen: Date.now() - 1200000 }
];

// Dummy TRU status data for local testing (following TruConfigStatus schema)
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
 * Custom hook for managing hardware (RSU/TRU) status
 * Provides unified interface for fetching and managing hardware status
 */
const useHardwareStatus = (type = 'rsu') => {
  const [hardwareList, setHardwareList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all', // 'all', 'online', 'offline'
  });

  /**
   * Fetch hardware status based on type
   */
  const fetchHardwareStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use dummy data for local testing
      // Uncomment below to use real API:
      // let data;
      // if (type === 'rsu') {
      //   data = await rsuService.getRSUStatuses();
      // } else if (type === 'tru') {
      //   data = await rsuService.getTRUStatuses();
      // }
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      let data;
      if (type === 'rsu') {
        data = DUMMY_RSU_STATUSES;
      } else if (type === 'tru') {
        // Map TruConfigStatus to a flat structure for the table
        data = DUMMY_TRU_STATUSES.map(status => ({
          ...status,
          unitId: status.unitConfig?.unitId,
          online: status.unitConfig?.bridgePluginStatus === 'Running',
          lastSeen: status.unitConfig?.lastUpdatedTimestamp,
        }));
      }
      
      setHardwareList(data || []);
      setFilteredList(data || []);
    } catch (err) {
      setError(err.message || `Failed to fetch ${type.toUpperCase()} status`);
      console.error(`Error fetching ${type} status:`, err);
    } finally {
      setLoading(false);
    }
  }, [type]);

  /**
   * Apply filters to hardware list
   */
  const applyFilters = useCallback(() => {
    let filtered = [...hardwareList];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item => {
        if (type === 'rsu') {
          return (
            item.ip?.toLowerCase().includes(searchLower) ||
            item.port?.toString().includes(searchLower)
          );
        } else {
          return (
            item.unitId?.toLowerCase().includes(searchLower) ||
            item.name?.toLowerCase().includes(searchLower)
          );
        }
      });
    }

    // Apply status filter
    if (filters.status !== 'all') {
      const isOnline = filters.status === 'online';
      filtered = filtered.filter(item => item.online === isOnline);
    }

    setFilteredList(filtered);
  }, [hardwareList, filters, type]);

  /**
   * Update filters
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * Reset filters
   */
  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      status: 'all',
    });
  }, []);

  /**
   * Get online count
   */
  const getOnlineCount = useCallback(() => {
    return hardwareList.filter(item => item.online).length;
  }, [hardwareList]);

  /**
   * Get offline count
   */
  const getOfflineCount = useCallback(() => {
    return hardwareList.filter(item => !item.online).length;
  }, [hardwareList]);

  /**
   * Refresh hardware status
   */
  const refresh = useCallback(async () => {
    await fetchHardwareStatus();
  }, [fetchHardwareStatus]);

  // Initial fetch
  useEffect(() => {
    fetchHardwareStatus();
  }, [fetchHardwareStatus]);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  return {
    hardwareList,
    filteredList,
    loading,
    error,
    filters,
    updateFilters,
    resetFilters,
    getOnlineCount,
    getOfflineCount,
    refresh,
  };
};

export default useHardwareStatus;
