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

import { useCallback, useEffect, useState } from 'react';
import { useTRUTopics } from '../../../context/TRUTopicsContext';

/**
 * Custom hook for managing topic configuration
 * Handles the data selection pipeline for TRU/RSU topics
 */
const useTopicConfiguration = () => {
  const {
    truTopics,
    selectedTRU,
    selectedRSUs,
    selectedTopics,
    loading,
    error,
    selectTRU,
    selectRSUs,
    toggleTopic,
    selectAllTopics,
    clearAllTopics,
    getRSUListForSelectedTRU,
    getTopicsForSelectedRSUs,
    saveTopicConfiguration,
    fetchTRUTopics,
  } = useTRUTopics();

  const [dataTypeFilter, setDataTypeFilter] = useState(['all']);
  const [topicsByRSU, setTopicsByRSU] = useState([]);
  const [filteredTopicsByRSU, setFilteredTopicsByRSU] = useState([]);

  /**
   * Initialize - fetch TRU topics on mount
   */
  useEffect(() => {
    fetchTRUTopics();
  }, [fetchTRUTopics]);

  /**
   * Update available topics when RSU selection changes
   */
  useEffect(() => {
    const topics = getTopicsForSelectedRSUs();
    setTopicsByRSU(topics);
    setFilteredTopicsByRSU(topics);
  }, [selectedRSUs, getTopicsForSelectedRSUs]);

  /**
   * Apply data type filter
   */
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

  /**
   * Handle TRU selection
   */
  const handleSelectTRU = useCallback(async (unitId) => {
    await selectTRU(unitId);
  }, [selectTRU]);

  /**
   * Handle RSUs selection
   */
  const handleSelectRSUs = useCallback(async (rsuEndpoints) => {
    await selectRSUs(rsuEndpoints);
  }, [selectRSUs]);

  /**
   * Handle topic toggle
   */
  const handleToggleTopic = useCallback((rsuKey, topicName) => {
    toggleTopic(rsuKey, topicName);
  }, [toggleTopic]);

  /**
   * Handle select all topics
   */
  const handleSelectAll = useCallback((topicsMap) => {
    selectAllTopics(topicsMap);
  }, [selectAllTopics]);

  /**
   * Handle clear all topics
   */
  const handleClearAll = useCallback(() => {
    clearAllTopics();
  }, [clearAllTopics]);

  /**
   * Handle data type filter change
   */
  const handleDataTypeFilterChange = useCallback((filterType) => {
    setDataTypeFilter(filterType);
  }, []);

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
   * Get RSU list for selected TRU
   */
  const getRSUList = useCallback(() => {
    return getRSUListForSelectedTRU();
  }, [getRSUListForSelectedTRU]);

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
   * Save configuration
   */
  const handleSave = useCallback(async () => {
    try {
      await saveTopicConfiguration();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [saveTopicConfiguration]);

  /**
   * Reset selection
   */
  const resetSelection = useCallback(() => {
    selectTRU(null);
    setDataTypeFilter(['all']);
  }, [selectTRU]);

  return {
    // State
    selectedTRU,
    selectedRSUs,
    selectedTopics,
    dataTypeFilter,
    filteredTopicsByRSU,
    loading,
    error,
    
    // TRU/RSU selection
    getTRUList,
    getRSUList,
    getAvailableDataTypes,
    handleSelectTRU,
    handleSelectRSUs,
    
    // Topic selection
    handleToggleTopic,
    handleSelectAll,
    handleClearAll,
    
    // Filtering
    handleDataTypeFilterChange,
    
    // Summary and actions
    getSelectionSummary,
    handleSave,
    resetSelection,
  };
};

export default useTopicConfiguration;
