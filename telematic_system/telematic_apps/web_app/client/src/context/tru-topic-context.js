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

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import rsuService from '../api/api-rsu';
import { useTRUStatus } from './tru-status-context';

const TRUTopicsContext = createContext();

/**
 * Context provider for TRU Topics management
 * Manages topic selection and configuration for TRUs and their associated RSUs
 */
export const TRUTopicsProvider = ({ children }) => {
  const { truStatuses } = useTRUStatus();
  const [truTopics, setTruTopics] = useState([]);
  const [selectedTRU, setSelectedTRU] = useState(null);
  const [selectedRSUs, setSelectedRSUs] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState({});
  const [dataTypeFilter, setDataTypeFilter] = useState(['all']);
  const [topicsByRSU, setTopicsByRSU] = useState([]);
  const [filteredTopicsByRSU, setFilteredTopicsByRSU] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const saveInProgressRef = useRef(false);

  // Initialize truTopics from truStatuses
  useEffect(() => {
    if (Array.isArray(truStatuses) && truStatuses.length > 0) {
      const topics = truStatuses.map(tru => ({
        unitId: tru.unitConfig?.unitId || '',
        rsuTopics: tru.rsuConfigs?.map(rsu => ({
          rsu: {
            ip: rsu.rsu?.ip || '',
            port: rsu.rsu?.port || 0
          },
          topics: []
        })) || []
      }));
      setTruTopics(topics);
    }
  }, [truStatuses]);

  /**
   * Fetch TRU topics by unit ID
   */
  const fetchTRUTopicsById = useCallback(async (unitId) => {
    setLoading(true);
    setError(null);
    try {
      // Call API to get available topics for this TRU
      const truTopicsMessage = {
        unitId: unitId,
        rsuTopics: [], // Empty for fetching available topics
        timestamp: Date.now()
      };
      
      const result = await rsuService.getAvailableTopics(truTopicsMessage);
      return result;
    } catch (err) {
      setError(err.message || `Failed to fetch TRU topics for ${unitId}`);
      console.error(`Error fetching TRU topics for ${unitId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update TRU topics configuration
   */
  const updateTRUTopics = useCallback(async (unitId, topicsData) => {
    // Prevent concurrent save operations
    if (saveInProgressRef.current) {
      console.warn('Save already in progress, ignoring duplicate request');
      throw new Error('Save operation already in progress');
    }

    saveInProgressRef.current = true;
    setLoading(true);
    setError(null);
    try {
      // Call API to confirm data selection
      const result = await rsuService.confirmDataSelection(topicsData);
      
      // Refresh the topics from backend to get the latest selection state
      const updatedTopics = await fetchTRUTopicsById(unitId);
      
      // Update truTopics context with the fresh data
      if (updatedTopics && updatedTopics.rsuTopics) {
        setTruTopics(prev => {
          const updated = [...prev];
          const index = updated.findIndex(t => t.unitId === unitId);
          if (index !== -1) {
            updated[index] = updatedTopics;
          } else {
            updated.push(updatedTopics);
          }
          return updated;
        });
      }
      
      return { success: true, message: 'Topics configuration saved successfully', data: result };
    } catch (err) {
      setError(err.message || `Failed to update TRU topics for ${unitId}`);
      console.error(`Error updating TRU topics for ${unitId}:`, err);
      throw err;
    } finally {
      setLoading(false);
      saveInProgressRef.current = false;
    }
  }, [fetchTRUTopicsById]);

  /**
   * Select a TRU for topic configuration
   */
  const selectTRU = useCallback(async (unitId) => {
    setSelectedTRU(unitId);
    setSelectedRSUs([]);
    setSelectedTopics({});
    setTopicsByRSU([]);
    setFilteredTopicsByRSU([]);
    
    // Fetch available topics for this TRU and store in context
    if (unitId) {
      try {
        const topics = await fetchTRUTopicsById(unitId);
        
        // Update truTopics with the fetched data
        if (topics && topics.rsuTopics) {
          setTruTopics(prev => {
            const updated = [...prev];
            const index = updated.findIndex(t => t.unitId === unitId);
            if (index >= 0) {
              updated[index] = topics;
            } else {
              updated.push(topics);
            }
            return updated;
          });
        }
      } catch (err) {
        console.error(`Error loading topics for TRU ${unitId}:`, err);
      }
    }
  }, [fetchTRUTopicsById]);

  /**
   * Select RSUs within the selected TRU
   * Fetches topic data from context (already loaded when TRU was selected)
   */
  const selectRSUs = useCallback((rsuEndpoints) => {
    setSelectedRSUs(rsuEndpoints);
    
    // If RSUs are selected, initialize selected topics from context
    if (rsuEndpoints.length > 0 && selectedTRU) {
      // Get topics from context (already fetched when TRU was selected)
      const truData = truTopics.find(t => t.unitId === selectedTRU);
      
      if (truData && truData.rsuTopics) {
        const topicsByRSU = {};
        truData.rsuTopics.forEach(rsuTopic => {
          const rsuKey = `${rsuTopic.rsu.ip}:${rsuTopic.rsu.port}`;
          // Only include topics for selected RSUs
          if (rsuEndpoints.some(ep => ep.ip === rsuTopic.rsu.ip && ep.port === rsuTopic.rsu.port)) {
            topicsByRSU[rsuKey] = rsuTopic.topics
              .filter(t => t.selected)
              .map(t => t.name);
          }
        });
        setSelectedTopics(topicsByRSU);
      }
    } else {
      // Clear selections when no RSUs are selected
      setSelectedTopics({});
      setTopicsByRSU([]);
      setFilteredTopicsByRSU([]);
    }
  }, [selectedTRU, truTopics]);

  /**
   * Toggle topic selection for a specific RSU
   */
  const toggleTopic = useCallback((rsuKey, topicName) => {
    setSelectedTopics(prev => {
      const rsuTopics = prev[rsuKey] || [];
      const newRsuTopics = rsuTopics.includes(topicName)
        ? rsuTopics.filter(t => t !== topicName)
        : [...rsuTopics, topicName];
      
      return {
        ...prev,
        [rsuKey]: newRsuTopics
      };
    });
  }, []);

  /**
   * Select all topics for specific RSUs
   */
  const selectAllTopics = useCallback((rsuTopicsMap) => {
    setSelectedTopics(prev => ({
      ...prev,
      ...rsuTopicsMap
    }));
  }, []);

  /**
   * Clear all topic selections for all RSUs
   */
  const clearAllTopics = useCallback(() => {
    setSelectedTopics({});
  }, []);

  /**
   * Clear topics for specific RSUs
   */
  const clearTopicsForRSUs = useCallback((rsuKeys) => {
    setSelectedTopics(prev => {
      const newTopics = { ...prev };
      rsuKeys.forEach(key => {
        delete newTopics[key];
      });
      return newTopics;
    });
  }, []);

  /**
   * Get RSU list for selected TRU
   */
  const getRSUListForSelectedTRU = useCallback(() => {
    if (!selectedTRU) return [];
    
    const truData = truTopics.find(t => t.unitId === selectedTRU);
    return truData?.rsuTopics?.map(rt => rt.rsu) || [];
  }, [selectedTRU, truTopics]);

  /**
   * Get available topics for selected RSUs grouped by RSU
   */
  const getTopicsForSelectedRSUs = useCallback(() => {
    if (!selectedTRU || selectedRSUs.length === 0) return [];
    
    const truData = truTopics.find(t => t.unitId === selectedTRU);
    if (!truData) return [];

    return selectedRSUs.map(rsu => {
      const rsuData = truData.rsuTopics?.find(
        rt => rt.rsu.ip === rsu.ip && rt.rsu.port === rsu.port
      );
      
      return {
        rsu,
        rsuKey: `${rsu.ip}:${rsu.port}`,
        topics: rsuData?.topics || []
      };
    });
  }, [selectedTRU, selectedRSUs, truTopics]);

  /**
   * Get TRU list for selection
   */
  const getTRUList = useCallback(() => {
    return truTopics.map(t => ({
      unitId: t.unitId,
      name: t.unitId,
      rsuCount: t.rsuTopics?.length || 0
    }));
  }, [truTopics]);

  /**
   * Get available data types from current topics grouped by RSU
   */
  const getAvailableDataTypes = useCallback(() => {
    return topicsByRSU.map(rsuGroup => ({
      rsuKey: rsuGroup.rsuKey,
      rsu: rsuGroup.rsu,
      topics: [...new Set(rsuGroup.topics.map(t => t.name.toLowerCase()))]
    }));
  }, [topicsByRSU]);

  /**
   * Handle data type filter change
   */
  const handleDataTypeFilterChange = useCallback((filterType) => {
    setDataTypeFilter(filterType);
  }, []);

  /**
   * Get selection summary
   */
  const getSelectionSummary = useCallback(() => {
    const totalTopics = Object.values(selectedTopics).reduce(
      (sum, topics) => sum + topics.length,
      0
    );
    const availableCount = filteredTopicsByRSU.reduce(
      (sum, rsuGroup) => sum + rsuGroup.topics.length,
      0
    );
    
    return {
      truSelected: !!selectedTRU,
      rsuSelected: selectedRSUs.length > 0,
      rsuCount: selectedRSUs.length,
      topicCount: totalTopics,
      availableTopicCount: availableCount,
    };
  }, [selectedTRU, selectedRSUs, selectedTopics, filteredTopicsByRSU]);

  /**
   * Reset selection
   */
  const resetSelection = useCallback(() => {
    selectTRU(null);
    setDataTypeFilter(['all']);
  }, [selectTRU]);
  /**
   * Save topic configuration
   * Constructs TRUTopicsMessage and sends to API via confirmDataSelection
   */
  const saveTopicConfiguration = useCallback(async () => {
    if (!selectedTRU) {
      throw new Error('No TRU selected');
    }

    if (selectedRSUs.length === 0) {
      throw new Error('No RSUs selected');
    }

    // Build TRUTopicsMessage matching API model
    // Only include selected RSUs with their topic selections
    const rsuTopicsMessages = selectedRSUs.map(rsu => {
      const rsuKey = `${rsu.ip}:${rsu.port}`;
      const selectedForRSU = selectedTopics[rsuKey] || [];
      
      const topics = selectedForRSU.map(topicName => ({
        name: topicName,
        selected: true
      }));

      return {
        rsu: {
          ip: rsu.ip,
          port: rsu.port
        },
        topics: topics
      };
    });

    // Construct complete TRUTopicsMessage
    const truTopicsMessage = {
      unitId: selectedTRU,
      rsuTopics: rsuTopicsMessages,
      timestamp: Date.now()
    };

    return await updateTRUTopics(selectedTRU, truTopicsMessage);
  }, [selectedTRU, selectedRSUs, selectedTopics, truTopics, updateTRUTopics]);

  // Update available topics when RSU selection changes
  useEffect(() => {
    const topics = getTopicsForSelectedRSUs();
    setTopicsByRSU(topics);
    setFilteredTopicsByRSU(topics);
  }, [selectedRSUs, getTopicsForSelectedRSUs]);

  // Apply data type filter
  useEffect(() => {
    if (dataTypeFilter.includes('all') || dataTypeFilter.length === 0) {
      setFilteredTopicsByRSU(topicsByRSU);
    } else {
      // Parse RSU-specific filters: format is "rsuKey-topic"
      const filtered = topicsByRSU.map(rsuGroup => {
        // Get filters that apply to this specific RSU
        const rsuSpecificFilters = dataTypeFilter
          .filter(filter => {
            if (filter === 'all') return false;
            const [filterRsuKey] = filter.split('-');
            return filterRsuKey === rsuGroup.rsuKey;
          })
          .map(filter => {
            const parts = filter.split('-');
            return parts.slice(1).join('-'); // Get topic name after rsuKey
          });
        
        // If no filters for this RSU, don't include it
        if (rsuSpecificFilters.length === 0) {
          return { ...rsuGroup, topics: [] };
        }
        
        // Filter topics that match
        const filteredTopics = rsuGroup.topics.filter(topic => 
          rsuSpecificFilters.some(filter => 
            topic.name.toLowerCase() === filter.toLowerCase()
          )
        );
        
        return { ...rsuGroup, topics: filteredTopics };
      }).filter(rsuGroup => rsuGroup.topics.length > 0);
      
      setFilteredTopicsByRSU(filtered);
    }
  }, [dataTypeFilter, topicsByRSU]);

  const value = {
    truTopics,
    selectedTRU,
    selectedRSUs,
    selectedTopics,
    dataTypeFilter,
    topicsByRSU,
    filteredTopicsByRSU,
    loading,
    error,
    fetchTRUTopicsById,
    updateTRUTopics,
    selectTRU,
    selectRSUs,
    toggleTopic,
    selectAllTopics,
    clearAllTopics,
    clearTopicsForRSUs,
    getRSUListForSelectedTRU,
    getTopicsForSelectedRSUs,
    getTRUList,
    getAvailableDataTypes,
    handleDataTypeFilterChange,
    getSelectionSummary,
    resetSelection,
    saveTopicConfiguration,
  };

  return <TRUTopicsContext.Provider value={value}>{children}</TRUTopicsContext.Provider>;
};

/**
 * Custom hook to use TRU Topics context
 */
export const useTRUTopics = () => {
  const context = useContext(TRUTopicsContext);
  if (!context) {
    throw new Error('useTRUTopics must be used within a TRUTopicsProvider');
  }
  return context;
};

export default TRUTopicsContext;
