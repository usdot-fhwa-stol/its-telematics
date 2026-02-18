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
import rsuService from '../api/api-rsu';
import AuthContext from './auth-context';

const TRUStatusContext = createContext();


/**
 * Context provider for TRU Status management
 * Manages TRU status information following TruConfigStatus model
 */
export const TRUStatusProvider = ({ children }) => {
  const authCtx = useContext(AuthContext);
  const [truStatuses, setTruStatuses] = useState([]);
  const [filteredStatuses, setFilteredStatuses] = useState([]);
  const [rsuStatuses, setRsuStatuses] = useState([]);
  const [filteredRSUStatuses, setFilteredRSUStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all', // 'all', 'running', 'error'
  });
  const [rsuFilters, setRsuFilters] = useState({
    search: '',
    status: 'all', // 'all', 'operate', 'standby', 'fault', 'other'
  });

  /**
   * Fetch all TRU statuses
   */
  const fetchTRUStatuses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statuses = await rsuService.getTRUStatuses();
      // Ensure statuses is an array
      const statusArray = Array.isArray(statuses) ? statuses : [];
      
      // Normalize TRU data to ensure unitConfig and pluginConfigStatus are properly extracted
      const normalizedStatuses = statusArray.map(tru => ({
        unitConfig: {
          unitId: tru.unitConfig?.unitId || '',
          name: tru.unitConfig?.name || null,
          maxConnections: tru.unitConfig?.maxConnections || 0,
          pluginHeartbeatInterval: tru.unitConfig?.pluginHeartbeatInterval || 0,
          healthMonitorPluginHeartbeatInterval: tru.unitConfig?.healthMonitorPluginHeartbeatInterval || 0,
          rsuStatusMonitorInterval: tru.unitConfig?.rsuStatusMonitorInterval || 0,
          timestamp: tru.unitConfig?.timestamp || null,
          lastUpdatedTimestamp: tru.unitConfig?.timestamp || tru.timestamp || null
        },
        pluginConfigStatus: {
          bridgePluginStatus: tru.pluginConfigStatus?.bridgePluginStatus?.toLowerCase() || 'pending',
          lastCommunicationTimestamp: tru.pluginConfigStatus?.lastCommunicationTimestamp || null,
          timestamp: tru.pluginConfigStatus?.timestamp || null
        },
        rsuConfigs: tru.rsuConfigs || [],
        timestamp: tru.timestamp || Date.now()
      }));
      
      setTruStatuses(normalizedStatuses);
      setFilteredStatuses(normalizedStatuses);
      
      // Extract all RSUs from TRU statuses
      const allRSUs = normalizedStatuses.flatMap(tru => 
        tru.rsuConfigs?.map(rsuConfig => {
          let statusValue = 'pending';
          if (rsuConfig.status !== null && rsuConfig.status !== undefined) {
            statusValue = rsuConfig.status || 'pending';
          }
          
          return {
            ...rsuConfig.rsu,
            status: statusValue,
            event: rsuConfig.event,
            unitId: tru.unitConfig?.unitId,
            lastSeen: rsuConfig.timestamp || null
          };
        }) || []
      );
      setRsuStatuses(allRSUs);
      setFilteredRSUStatuses(allRSUs);
      
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Failed to fetch TRU statuses');
      console.error('Error fetching TRU statuses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Filter TRUs by plugin status
   */
  const filterByStatus = useCallback((isActive) => {
    const statusFilter = isActive ? 'running' : 'error';
    return truStatuses.filter(status => 
      status.pluginConfigStatus?.bridgePluginStatus?.toLowerCase() === statusFilter
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
   * Apply filters to TRU list
   */
  const applyFilters = useCallback(() => {
    let filtered = [...truStatuses];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.unitConfig?.unitId?.toLowerCase().includes(searchLower) ||
        item.unitConfig?.name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(item => {
        const pluginStatus = item.pluginConfigStatus?.bridgePluginStatus?.toLowerCase() || 'pending';
        return filters.status === pluginStatus;
      });
    }

    setFilteredStatuses(filtered);
  }, [truStatuses, filters]);

  /**
   * Update filters
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * Get count by specific status
   */
  const getStatusCount = useCallback((statusValue) => {
    return truStatuses.filter(item => {
      const pluginStatus = item.pluginConfigStatus?.bridgePluginStatus?.toLowerCase() || 'pending';
      return pluginStatus === statusValue?.toLowerCase();
    }).length;
  }, [truStatuses]);

  /**
   * Apply filters to RSU list
   */
  const applyRSUFilters = useCallback(() => {
    let filtered = [...rsuStatuses];

    // Apply search filter
    if (rsuFilters.search) {
      const searchLower = rsuFilters.search?.toLowerCase();
      filtered = filtered.filter(item => 
        item.ip?.toLowerCase().includes(searchLower) ||
        item.port?.toString().includes(searchLower)
      );
    }

    // Apply status filter
    if (rsuFilters.status !== 'all') {
      filtered = filtered.filter(item => {
        const itemStatus = item.status?.toLowerCase() || 'pending';
        return rsuFilters.status === itemStatus;
      });
    }

    setFilteredRSUStatuses(filtered);
  }, [rsuStatuses, rsuFilters]);

  /**
   * Update RSU filters
   */
  const updateRSUFilters = useCallback((newFilters) => {
    setRsuFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * Get count by specific RSU status
   */
  const getRSUStatusCount = useCallback((statusValue) => {
    return rsuStatuses.filter(item => {
      const status = item.status?.toLowerCase() || 'pending';
      return status === statusValue?.toLowerCase();
    }).length;
  }, [rsuStatuses]);

  /**
   * Refresh TRU statuses
   */
  const refresh = useCallback(async () => {
    await fetchTRUStatuses();
  }, [fetchTRUStatuses]);

  // Initial data fetch - only when authenticated
  useEffect(() => {
    if (authCtx.isAuth) {
      fetchTRUStatuses();
    }
  }, [fetchTRUStatuses, authCtx.isAuth]);

  // Apply filters when they or truStatuses change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Apply RSU filters when they or rsuStatuses change
  useEffect(() => {
    applyRSUFilters();
  }, [applyRSUFilters]);

  const value = {
    truStatuses,
    filteredStatuses,
    rsuStatuses,
    filteredRSUStatuses,
    loading,
    error,
    lastUpdated,
    filters,
    rsuFilters,
    fetchTRUStatuses,
    filterByStatus,
    getRSUCount,
    updateFilters,
    updateRSUFilters,
    getStatusCount,
    getRSUStatusCount,
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
